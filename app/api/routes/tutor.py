from fastapi import APIRouter
from app.models.schemas import DoubtRequest, GenericMessageResponse, TutorChatRequest
from app.services.tutor_service import TutorService


router = APIRouter()


@router.post("/doubt", response_model=GenericMessageResponse)
async def ask_doubt(payload: DoubtRequest):
    result = await TutorService().ask_doubt(payload)
    return GenericMessageResponse(message="Doubt answered", data=result)


@router.post("/chat", response_model=GenericMessageResponse)
async def chat_tutor(payload: TutorChatRequest):
    result = await TutorService().chat(payload)
    return GenericMessageResponse(message="Tutor response generated", data=result)
