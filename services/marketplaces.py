import os


def get_marketplace_summary():
    return {
        "upwork": {
            "connected": bool(os.getenv("UPWORK_API_KEY")),
            "message": "Connect your Upwork account to sync jobs, proposals, and messages.",
        },
        "fiverr": {
            "connected": bool(os.getenv("FIVERR_API_KEY")),
            "message": "Connect your Fiverr account to sync orders, gigs, and conversations.",
        },
    }
