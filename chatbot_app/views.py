from map_app.models import User
from django.http import JsonResponse
from django.conf import settings
from .models import *
from .mode1_codes import *
from .mode2_codes import *
from .mode3_codes import *
from .mode4_codes import *
from django.views.decorators.csrf import csrf_exempt

import json
import traceback


def clear_chat_conversation_log(request, user_id):
    return clear_conversation_log_db(user_id)


@csrf_exempt
def get_prompt_response(request, user_id, chat_id, mode):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print(data)
            user = User.objects.get(id=user_id)
            db_name = user.organization.id
            bound = None
            box = None
            if data['box']:
                box = data['box']
            if data['extent']:
                bound = generate_bounding_box_points(data['extent'])
            prompt = data.get("message", "")
            if bound and box:
                extended_prompt = f"{prompt} with Bounds :{bound} and Box :{data['box']}"
            else:
                extended_prompt = prompt
            queries = None
            if (
                prompt != "I want to calculate forest fire area"
                and prompt != "I want to get the green cover change"
                and not "total_area" in prompt
                and not "postive-" in prompt
                and not "negative-" in prompt
            ):
                if mode == 1:
                    rephrase = None
                    if (
                        "buffer" in prompt.lower()
                        or "boundary" in prompt.lower()
                        or "range" in prompt.lower()
                    ):
                        # rephrase=gemini_chatbot(f"Rephrase this : {prompt}")
                        rephrase = f'"{prompt} . Use meter units to create the buffer and transform if required"'
                    response_text = get_chat_response(
                        prompt if not rephrase else rephrase, db_name
                    )
                    print("Mode1", response_text)
                elif mode == 2:
                    response_text = get_llama_response(prompt)
                elif mode == 3:
                    try:
                        response_text = invoke_chain(
                            prompt,
                            data["box"] if "box" in data else None,
                            data["extent"] if "extent" in data else None,
                            user_id,
                            mode,
                            chat_id,
                        )
                    except Exception as e:
                        traceback.print_exc()
                        response_text = "Please Change Prompt"
                # elif mode == 3:
                #     try:
                #         print("extended_prompt",extended_prompt)
                #         response_text = invoke_llm_function(extended_prompt
                #         )
                #     except Exception as e:
                #         traceback.print_exc()
                #         response_text = "Please Change Prompt"
            else:
                response_text = (
                    "Okay. Let's go through it step by step. Please select the Date"
                )
                if "total_area" in prompt:
                    area = prompt.split("-")[1]
                    response_text = f"Total Burnt Forest Area is {area} sq km "
                    prompt = ""
                if "postive-" in prompt:
                    sp = prompt.split("-")
                    pos, neg = sp[1], sp[3]
                    response_text = (
                        f"Positive Change Total Area: {float(pos):.2f} sq km. "
                        f"Negative Change Total Area: {float(neg):.2f} sq km. "
                        f"Net Change: {abs(float(pos) - float(neg)):.2f} sq km"
                    )
                    prompt = ""
            gemini_response = ""
            paths = []
            gpt_response = ""
            gemini_response = ""
            if mode == 1 and isinstance(response_text, list):
                csv_directory = os.path.join(settings.MEDIA_ROOT, "chatbotcsv")
                os.makedirs(csv_directory, exist_ok=True)
                queries = response_text
                response_text = []
                if not len(queries):
                    response_text = (
                        "Can't perform this analysis. Try with another prompt"
                    )
                try:
                    response_text, paths = query_loop(
                        queries, chat_id, user_id, prompt, db_name
                    )
                    if response_text in [
                        "Can't perform this analysis. Try with another prompt",
                        "No Data Available",
                    ]:
                        new = f"{prompt}\n\nRephrase this prompt for AI chatbot to understand, don't give suggestions, just return rephrased single prompt. make sure to turn all values into smaller case if needed. and put spaces in between fetching values. like (prabhag 1 instead of prabhag1)"
                        new_prompt = gemini_chatbot(new)
                        print("new", new_prompt)
                        if (
                            "buffer" in new_prompt.lower()
                            or "boundary" in new_prompt.lower()
                            or "range" in new_prompt.lower()
                        ):
                            # rephrase=gemini_chatbot(f"Rephrase this : {prompt}")
                            rephrase = f'"{new_prompt} . Use meter units to create the buffer and transform if required"'
                            print("rephrased", rephrase)
                        queries = get_chat_response_base(
                            new_prompt if not rephrase else rephrase, db_name
                        )
                        try:
                            response_text, paths = query_loop(
                                queries, chat_id, user_id, prompt, db_name
                            )
                        except Exception as e:
                            traceback.print_exc()
                except Exception as e:
                    traceback.print_exc()
                    new = f"{prompt}\n\nRephrase this prompt for AI chatbot to understand, don't give suggestions, just return rephrased single prompt. make sure to turn all values into smaller case if needed. and put spaces in between fetching values. (prabhag 1 instead of prabhag1)"
                    new_prompt = gemini_chatbot(new)
                    print("new", new_prompt)
                    queries = get_chat_response_base(new_prompt, db_name)
                    try:
                        response_text, paths = query_loop(
                            queries, chat_id, user_id, prompt, db_name
                        )
                    except Exception as e:
                        response_text = (
                            "Can't perform this analysis. Try with another prompt"
                        )
                        traceback.print_exc()
            elif mode == 1 and response_text is None:
                response_text = "no records found!"
            if not mode == 1:
                response_text = response_text

            if mode != 3:
                chat_history = ChatHistory.objects.create(
                    user=user,
                    prompt_message=prompt,
                    chat_response=response_text,
                    paths=paths,
                    chat_id=chat_id,
                    mode=mode,
                )
                chat_history.save()
            return JsonResponse(
                {
                    "response": response_text,
                    "gemini_response": gemini_response,
                    "paths": paths,
                    "queries": queries if queries else None,
                    "mode": mode,
                }
            )
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=400)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)


def get_recent_chat_id(request, user_id, chat_mode):
    try:
        user = User.objects.get(id=user_id)
        chat_history = ChatHistory.objects.filter(
            user=user,
            mode=chat_mode,
        ).last()
        # ).latest("created_at")
        latest_chat_id = chat_history.chat_id if chat_history else None
        return JsonResponse({"recent_chat_id": latest_chat_id})
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


def get_chat_history(request, user_id, chat_id):
    try:
        user = User.objects.get(id=user_id)
        chat_history = ChatHistory.objects.filter(
            user=user,
            chat_id=chat_id,
        ).order_by("created_at")
        response_histories = []
        for chat in chat_history:
            response_histories.append(
                {"sender": "user", "text": chat.prompt_message, "time": chat.created_at}
            )
            try:
                chat_response = eval(chat.chat_response)
            except Exception as e:
                chat_response = chat.chat_response
            if isinstance(chat_response, dict):
                chat_feedback = chat_response["chat_feedback"]
                response_histories.append(
                    {
                        "sender": "bot",
                        "text": chat_response,
                        "mode": chat.mode,
                        "paths": chat.paths,
                    }
                )
                response_histories.append(
                    {
                        "sender": "bot",
                        "text": chat_feedback,
                        "mode": chat.mode,
                        "paths": chat.paths,
                    }
                )
            else:
                response_histories.append(
                    {
                        "sender": "bot",
                        "text": chat.chat_response,
                        "mode": chat.mode,
                        "paths": chat.paths,
                    }
                )
        return JsonResponse({"his": response_histories})
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


def list_conversations(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        histories = ChatHistory.objects.filter(
            user=user,
        )
        conversations = {}
        for history in histories:
            if history.chat_id in conversations.keys():
                conversations[history.chat_id]["total_messages"] += 1
            else:
                conversations[history.chat_id] = {
                    "chat_id": history.chat_id,
                    "created_at": str(history.created_at),
                    "mode": history.mode,
                    "total_messages": 1,
                }
        print(conversations.values())
        return JsonResponse({"conversations": list(conversations.values())})
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


def delete_conversation(request, user_id, chat_id):
    try:
        user = User.objects.get(id=user_id)
        histories = ChatHistory.objects.filter(
            user=user,
            chat_id=chat_id,
        )
        histories.delete()
        return JsonResponse(
            {"success": True, "message": "conversation deleted successfully"},
            status=200,
        )
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"error": "error occured!"}, status=500)
