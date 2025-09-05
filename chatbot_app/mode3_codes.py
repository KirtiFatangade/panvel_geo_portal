from django.http import JsonResponse
from langchain_core.output_parsers import StrOutputParser
from langchain.prompts import ChatPromptTemplate
import re
import ast
import pandas as pd
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.postgres import PGVectorStore
from datetime import datetime
from .llm_models_setup import *
from .models import *
from map_app.main_map.sat import *

import warnings

warnings.filterwarnings("ignore")

dataset_names_list = []
open_src_csv_file_path = "config_files/geeDF.csv"
all_data_excel_file_path = "config_files/Portal_Dataset.xlsx"
open_src_data_df = pd.read_csv(open_src_csv_file_path)
all_data_df = pd.read_excel(all_data_excel_file_path)
dataset_names_list.extend(open_src_data_df["display_name"].tolist())

GLOBAL_ATTRIBUTES = {}
ATTRIBUTES = {
    "dataset_name": None,
    "dates": None,
    "clip": None,
    "bands": None,
    "indices": None,
}

vector_store_data_visualisation = PGVectorStore.from_params(
    database=database,
    host=host,
    password=password,
    port=port,
    user=username,
    table_name="data_visualization",
    embed_dim=1024,
    hnsw_kwargs={
        "hnsw_m": 16,
        "hnsw_ef_construction": 64,
        "hnsw_ef_search": 40,
        "hnsw_dist_method": "vector_cosine_ops",
    },
)


data_visualization_template = f"""
You are a highly intelligent attribute extractor and conversational chatbot. Your role is to analyze the ongoing conversation
between the user and chatbot, understand the context, and either extract specific attributes from the last user query or generate a relevant response.
If the user's latest question is unrelated to previous interactions, treat it as a new question.
### Instructions for Attribute Extraction:
1. **Dataset Name and Dates**:
   - Identify the dataset name from {str(dataset_names_list)}.
   - Extract a date in `yyyy-mm-dd` format or a date range in `[start_date, end_date]` format:
     - If only one date is present, use `[start_date, start_date + 1]`.
     - If no date is provided, return `[None, None]`.
2. **Region Extraction**:
   - If the prompt includes a **region** reference, determine whether it’s a **district**, **state**, or **country**.
   - Based on the type of region:
     - For **district**, identify the corresponding `state` (`selState`) and `country` (`selCont`).
     - For **state**, identify the corresponding `country` (`selCont`).
3. **Clip Key Generation**:
   - Construct the `clip` key based on extracted region details:
     - For a **district**: `["dis", [selDis, selState, selCont]]`
     - For a **state**: `["state", [selState, selCont]]`
     - For a **country**: `["cont", [selCont]]`
   - If no region information is provided, prompt the user to specify relevant regions for extraction.
4. **Attribute Extraction**:
   - Extract any specified attributes in the prompt, such as **bands**, **indices**, **cloud cover**, or **clip-by method**.
5. **Output Format**:
   - If the dataset name is identified, output a Python dictionary with the following keys:
     - `dataset_name`, `dates`, `bands`, `indices`, and `clip` (if applicable).
   - For any missing values, use `None`.
### Expected Output:
- Return **only a Python dictionary** with keys (`dataset_name`, `dates`, `bands`, `indices`, `clip`) and corresponding values.
- Do not return a Python function or code block.
- If the user’s input is descriptive or doesn't request data extraction, respond appropriately in natural language.
Input prompt: {{input}}
Output: Return the processed dictionary directly.
"""


def handle_response(response):
    response = response.replace("```python", "").replace("```", "").strip()
    dict_pattern = r"(\{.*?\})"
    match = re.search(dict_pattern, response, re.DOTALL)
    if match:
        dict_str = match.group(0)
        try:
            parsed_dict = ast.literal_eval(dict_str)
            if isinstance(parsed_dict, dict):
                rest_of_response = response.replace(dict_str, "").strip()
                return True, parsed_dict, rest_of_response
        except (SyntaxError, ValueError):
            return False, response, None
    else:
        return False, response, None


def dynamic_chain_runner(input_dict):
    prompt = ChatPromptTemplate.from_template(template=data_visualization_template)
    chain = prompt | gemini_llm | StrOutputParser()
    res = chain.invoke(input_dict)
    status, dict_result, rest_of_response = handle_response(res)
    if status:
        output = {
            "dataset_name": dict_result.get("dataset_name", None),
            "dates": dict_result.get("dates", None),
            "clip": dict_result.get("clip", None),
            "bands": dict_result.get("bands", None),
            "indices": dict_result.get("indices", None),
        }
        if output["dataset_name"] is not None:
            return True, output, rest_of_response
        else:
            return False, output, rest_of_response
    else:
        return False, dict_result, rest_of_response


def extract_value_from_curly_braces(input_string):
    cleaned_input = input_string.strip().replace("```python", "").replace("```", "")
    match = re.search(r"\{(.*?)\}", cleaned_input, re.DOTALL)
    if match:
        dict_string = "{" + match.group(1) + "}"
        dict_string = re.sub(r"\s+", " ", dict_string).strip()
        try:
            return ast.literal_eval(dict_string)
        except Exception as e:
            traceback.print_exc()
    return None


def prepare_conversation_for_question_answering_db(
    user_id,
    chat_mode,
    chat_id,
):
    try:
        chat_histories = ChatHistory.objects.filter(
            user=user_id,
            log_cleared=False,
            mode=chat_mode,
            chat_id=chat_id,
        ).order_by("created_at")
    except ChatHistory.DoesNotExist:
        return ""
    conversation_str = ""
    conversation_list = []
    for entry in chat_histories:
        conversation_list.append(
            {"user": entry.prompt_message, "chatbot": entry.chat_response}
        )
        conversation_str += f"{entry.prompt_message}: {entry.chat_response}\n"
    return conversation_str, conversation_list


def clear_conversation_log_db(user_id):
    try:
        user = User.objects.get(id=user_id)
        ChatHistory.objects.filter(user=user, mode=3).update(log_cleared=True)
        return JsonResponse({"success": True}, status=200)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"success": False}, status=500)


def update_conversation_log_db(
    user_id, user_prompt, chat_mode, chat_id, chatbot_response=None
):
    user = User.objects.get(id=user_id)
    if chatbot_response is None:
        chat_history = ChatHistory.objects.create(
            user=user,
            prompt_message=user_prompt,
            chat_response=None,
            paths=[],
            chat_id=chat_id,
            mode=chat_mode,
        )
        chat_history.save()
    else:
        try:
            chat_history = ChatHistory.objects.filter(
                user=user, mode=chat_mode, chat_id=chat_id
            ).latest("created_at")
            chat_history.chat_response = chatbot_response
            chat_history.save()
        except Exception as e:
            traceback.print_exc()


def question_answering(prompt):
    vector_index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store_data_visualisation
    )
    query_engine = vector_index.as_chat_engine(
        chat_mode="context",
        memory=memory,
        system_prompt=(
            "You are an interactive chatbot designed to analyze the entire conversation history between the user and the chatbot. "
            "However, your primary focus should be on the most recent message from the user and the chatbot's last response. "
            "Use the context of the full conversation to inform your answer, but your response should mainly address the latest query from the user. "
            "If the user's last question is clear, concise, and related to the available information or previous responses, "
            "you should directly answer it using the relevant details from the conversation. "
            "Avoid repeating or summarizing previous responses unless explicitly asked for. "
            "Your goal is to provide a focused, relevant, and direct answer to the user's most recent question."
        ),
    )
    response = query_engine.chat(prompt)
    return response


def conversational_chatbot(prompt):
    vector_index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store_data_visualisation
    )
    query_engine = vector_index.as_chat_engine(
        chat_mode="context",
        memory=memory,
        system_prompt=(
            """
            You are a smart and interactive assistant dedicated to helping users analyze and visualize their data effectively. 
            Ask insightful, context-driven questions to clarify the user’s objectives and guide them toward the best options 
            for achieving their analysis goals. Propose useful parameters and adjustments as needed to enhance their 
            visualizations and analysis outcomes. Keep responses concise and focused, ensuring each step adds practical 
            value to their data exploration journey.
            """
        ),
    )
    response = query_engine.chat(prompt)
    return response


def reset_attributes(attributes):
    for key, value in attributes.items():
        if isinstance(value, list):
            attributes[key] = [None] * len(value)
        else:
            attributes[key] = None
    return attributes


def update_attributes(existing_attributes, new_attributes):
    for key, value in new_attributes.items():
        if isinstance(value, list) and isinstance(existing_attributes.get(key), list):
            existing_attributes[key] = [
                new_v if new_v is not None else old_v
                for old_v, new_v in zip(existing_attributes[key], value)
            ]
        elif value is not None:
            existing_attributes[key] = value
    return existing_attributes


def next_date_available(sorted_dates, given_date_str):
    try:
        given_date = datetime.strptime(given_date_str, "%Y-%m-%d")
        if isinstance(sorted_dates[0], list):
            sorted_dates = [item[0] for item in sorted_dates]
        sorted_dates = [str(date) for date in sorted_dates]
        sorted_dates = sorted(sorted_dates)
        sorted_dates_dt = [datetime.strptime(date, "%Y-%m-%d") for date in sorted_dates]
        for date in sorted_dates_dt:
            if date > given_date:
                return date.strftime("%Y-%m-%d")
        return None
    except Exception as e:
        traceback.print_exc()
        return None


def check_optional_param(attributes, optional_param_list):
    remaining_params = []
    for key, val in attributes.items():
        for elem in optional_param_list:
            if (key == elem and val is None) or (
                isinstance(val, list) and all(v is None for v in val)
            ):
                remaining_params.append(key)
    return remaining_params


def check_date_availability(input_dict):
    dataset_name = input_dict.get("dataset_name")
    user_given_dates = input_dict.get("dates")
    address = open_src_data_df.loc[all_data_df["name"] == dataset_name, "address"].iloc[
        0
    ]
    year, month, _ = user_given_dates[0].split("-")
    available_dates = get_dates(
        month, year, dataset_name, input_dict["extent"], address, cloud=None
    )
    sorted_dates = sorted([dt.strftime("%Y-%m-%d") for dt in available_dates])
    next_date = next_date_available(sorted_dates, user_given_dates[0])

    if sorted_dates:
        if user_given_dates[0] in sorted_dates:
            return (
                True,
                f"The data for the given date is available. Additionally, the following dates are also available: {sorted_dates}. Ask the user if they would like to proceed with any of the available optional parameters for analysis.",
            )
        else:
            return (
                False,
                f"The data for the requested region is not available for the given date. However, data is available for {next_date}. Ask the user if they would like to proceed with this alternative date instead.",
            )
    else:
        return (
            False,
            f"There are no dates available for this region, Reduce the region to get dates.",
        )


def check_required_parameter(input_dict, input_prompt, user_id, chat_mode, chat_id):
    if user_id not in GLOBAL_ATTRIBUTES:
        GLOBAL_ATTRIBUTES[user_id] = ATTRIBUTES
    USER_ATTRIBUTES = GLOBAL_ATTRIBUTES[user_id]
    required_parameter = {
        "10m Satellite data (Sentinel 2)": ["dataset_name", "dates"],
        "90m Digital Elevation Satellite data (SRTM)": ["dataset_name"],
        "Atmospheric Methane Concentration (Sentinel 5p)": ["dataset_name", "dates"],
        "Atmospheric CO Concentration (Sentinel-5P)": ["dataset_name", "dates"],
        "Synthetic Aperture Radar - Sentinel 1": ["dataset_name", "dates"],
        "MODIS RGB": ["dataset_name", "dates"],
        "Germany High-Res Image (20cm)": ["dataset_name"],
        "Global Digital Surface Model 30m": ["dataset_name"],
    }

    optional_parameter = {
        "10m Satellite data (Sentinel 2)": ["bands", "indices"],
        "90m Digital Elevation Satellite data (SRTM)": [],
        "Atmospheric Methane Concentration (Sentinel 5p)": [],
        "Atmospheric CO Concentration (Sentinel-5P)": [],
        "Synthetic Aperture Radar - Sentinel 1": [],
        "MODIS RGB": [],
        "Germany High-Res Image (20cm)": [],
        "Global Digital Surface Model 30m": [],
    }

    dataset_name = input_dict.get("dataset_name")
    if dataset_name is None:
        response = f"Ask user to provide particular dataset name to visualise data for."
        update_conversation_log_db(user_id, input_prompt, chat_mode, chat_id, response)
        return False, False, response

    if dataset_name not in required_parameter:
        response = f"The dataset '{dataset_name}' is not recognized."
        update_conversation_log_db(user_id, input_prompt, chat_mode, chat_id, response)
        return False, False, response

    required_fields = required_parameter[dataset_name]

    missing_required = []
    for field in required_fields:
        if (field != "dataset_name" and input_dict.get(field) is None) or (
            isinstance(input_dict.get(field), list)
            and all(item is None for item in input_dict.get(field))
        ):
            missing_required.append(field)

    if len(missing_required) > 0:
        response = (
            f"Ask user to provide required fields from : {', '.join(missing_required)}."
        )
        update_conversation_log_db(user_id, input_prompt, chat_mode, chat_id, response)
        return False, False, response
    else:
        # state, response = check_date_availability(input_dict)
        state = True
        optional_param_flag = False
        if state:
            optional_fields = optional_parameter.get(dataset_name, [])
            remaining_params = check_optional_param(USER_ATTRIBUTES, optional_fields)
            if remaining_params:
                response = f"Ask the user if they want to add additional parameters from {remaining_params}."
                optional_param_flag = True
            else:
                response = "Ask the user if you can assist them in some other way."
        else:
            response
        update_conversation_log_db(user_id, input_prompt, chat_mode, chat_id, response)
        return True, optional_param_flag, response


def print_conversation_logs(logs):
    for log in logs:
        print(f"USER: {log['user']} | CHATBOT: {log['chatbot']}")


def invoke_chain(question, box, extent, user_id, mode=None, chat_id=None):
    if user_id not in GLOBAL_ATTRIBUTES:
        GLOBAL_ATTRIBUTES[user_id] = ATTRIBUTES
    USER_ATTRIBUTES = GLOBAL_ATTRIBUTES[user_id]
    USER_ATTRIBUTES = reset_attributes(USER_ATTRIBUTES)
    update_conversation_log_db(user_id, question, mode, chat_id, None)
    _, conversation_logs_list = prepare_conversation_for_question_answering_db(
        user_id=user_id,
        chat_id=chat_id,
        chat_mode=mode,
    )

    print(f"conversation_logs:\n\n")
    print_conversation_logs(conversation_logs_list)

    status, dict_attr_response, rest_of_response = dynamic_chain_runner(
        (conversation_logs_list if len(conversation_logs_list) > 0 else question)
    )
    print(f"status: {status} | dict_attr_response: {dict_attr_response}")
    if status:
        USER_ATTRIBUTES = update_attributes(USER_ATTRIBUTES, dict_attr_response)
        required_flag, optional_flag, response = check_required_parameter(
            USER_ATTRIBUTES,
            question,
            user_id,
            mode,
            chat_id,
        )

        if required_flag:
            function_to_call = "sat_geo_df_llm"
            print("ALL DATA REQUIREMENTS SATISFIED FOR VISUALISATION!")
            func = globals()[function_to_call]
            if callable(func):
                try:
                    user = User.objects.get(id=user_id)
                    user.chat = USER_ATTRIBUTES
                    user.save()
                    USER_ATTRIBUTES["id"] = user_id
                    USER_ATTRIBUTES["extent"] = extent
                    if isinstance(USER_ATTRIBUTES["dates"], str):
                        USER_ATTRIBUTES["dates"] = [USER_ATTRIBUTES["dates"]]
                    output_dict = func(**USER_ATTRIBUTES)
                    if output_dict is None:
                        return "Some Error Occured!"
                    print(f"function_output: {output_dict}")
                    final_response = conversational_chatbot(response)
                    if isinstance(output_dict, dict):
                        output_dict["chat_feedback"] = final_response.response
                    update_conversation_log_db(
                        user_id,
                        question,
                        mode,
                        chat_id,
                        str(output_dict),
                    )
                    return output_dict
                except Exception as e:
                    traceback.print_exc()
            else:
                print(f"{function_to_call} is not callable")

        final_response = conversational_chatbot(response)
    else:
        conversation_logs, _ = prepare_conversation_for_question_answering_db(
            user_id=user_id, chat_id=chat_id, chat_mode=mode
        )
        final_response = question_answering(
            (conversation_logs if len(conversation_logs) > 0 else question)
        )

    update_conversation_log_db(
        user_id, question, mode, chat_id, final_response.response
    )
    print(f"#### final_response: {final_response}")
    return final_response.response


# def invoke_chain(question, box, extent, user_id, mode=None, chat_id=None):
#     pass
