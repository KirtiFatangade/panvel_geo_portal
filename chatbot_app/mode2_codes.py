from .llm_models_setup import *
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.postgres import PGVectorStore

vector_store_portal_manual = PGVectorStore.from_params(
    database=database,
    host=host,
    password=password,
    port=port,
    user=username,
    table_name="drishti_geo_portal_manual",
    embed_dim=1024,
    hnsw_kwargs={
        "hnsw_m": 16,
        "hnsw_ef_construction": 64,
        "hnsw_ef_search": 40,
        "hnsw_dist_method": "vector_cosine_ops",
    },
)


def get_llama_response(prompt):
    vector_index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store_portal_manual
    )
    query_engine = vector_index.as_chat_engine(
        chat_mode="context",
        memory=memory,
        system_prompt=(
            "You are a helpful document analyzer guiding users on how to use a portal. Your task is to assist users by providing detailed, relevant answers based on the document provided. If the document doesn't explicitly mention the requested information, generate a plausible, informative response based on general knowledge about using portals and best practices. Ensure that your response sounds natural and helpful, as if the information is available in the document, but don't mention any lack of information in the document itself. Present the response in a concise and user-friendly manner, keeping in mind that the document is a user manual for the portal."
        ),
    )
    chat_response = query_engine.chat(prompt)
    return chat_response.response
