from phonepe.sdk.pg.payments.v1.payment_client import PhonePePaymentClient
from phonepe.sdk.pg.env import Env
from phonepe.sdk.pg.payments.v1.models.request.pg_pay_request import PgPayRequest
import os
import uuid

merchant_id = os.getenv("PPAY_ID")
salt_key = os.getenv("PPAY_KEY")
salt_index = 1
env = Env.PROD

phonepe_client = PhonePePaymentClient(
    merchant_id=merchant_id, salt_key=salt_key, salt_index=salt_index, env=env
)


def get_url_phonepe(
    amount,
    user_id,
):
    unique_transaction_id = str(uuid.uuid4())[:-2]
    id_assigned_to_user_by_merchant = user_id
    ui_redirect_url = (
        f"https://portal.vasundharaa.in/payment-success/{unique_transaction_id}"
    )
    s2s_callback_url = f"https://portal.vasundharaa.in/maps/payment-success"
    pay_page_request = PgPayRequest.pay_page_pay_request_builder(
        merchant_transaction_id=unique_transaction_id,
        amount=amount,
        merchant_user_id=id_assigned_to_user_by_merchant,
        callback_url=s2s_callback_url,
        redirect_url=ui_redirect_url,
    )
    pay_page_response = phonepe_client.pay(pay_page_request)
    pay_page_url = pay_page_response.data.instrument_response.redirect_info.url
    return unique_transaction_id, pay_page_url


def check_payment_status(id):
    phonepe_response = phonepe_client.check_status(id)
    if phonepe_response and phonepe_response.success:
        payment_instrument = phonepe_response.data.payment_instrument
        res = {
            "success": True,
            "code": phonepe_response.code,
            "data": {
                "paymentState": phonepe_response.data.state,
                "transactionId": phonepe_response.data.transaction_id,
                "amount": phonepe_response.data.amount,
                "paymentInstrument": {
                    "type": (
                        payment_instrument.type.value if payment_instrument else None
                    )
                },
            },
        }
    else:
        res = {
            "success": False,
            "code": phonepe_response.code if phonepe_response else "INTERNAL_ERROR",
            "data": None,
        }
    return res
