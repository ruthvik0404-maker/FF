import os

from flask import Flask, render_template

from services.firebase_config import FIREBASE_WEB_CONFIG
from services.marketplaces import get_marketplace_summary
from services.mock_data import DASHBOARD_DATA


app = Flask(__name__)


def render_page(active_page):
    marketplace_summary = get_marketplace_summary()
    return render_template(
        "dashboard.html",
        active_page=active_page,
        dashboard_data=DASHBOARD_DATA,
        marketplace_summary=marketplace_summary,
        firebase_config=FIREBASE_WEB_CONFIG,
    )


@app.route("/")
def dashboard():
    return render_page("overview")


@app.route("/projects")
def projects():
    return render_page("projects")


@app.route("/clients")
def clients():
    return render_page("clients")


@app.route("/bookmarks")
def bookmarks():
    return render_page("bookmarks")


@app.route("/companion")
def companion():
    return render_page("companion")


@app.route("/integrations")
def integrations():
    return render_page("integrations")


@app.route("/account")
def account():
    return render_page("account")


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "1") == "1",
    )
