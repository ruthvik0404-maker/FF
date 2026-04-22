# Freelance Flow

Freelance Flow is a Python web dashboard for freelancers to track projects, clients, bookmarks, productivity, and future Upwork or Fiverr integrations.

The Firebase web configuration has already been added to the project so we can move into live data wiring next.

## Run locally

1. Create a virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Copy `.env.example` values into your environment or a local `.env` setup.
4. Start the app with `python app.py`.

## Planned integrations

- Firebase for storing projects, clients, notes, and dashboard data.
- Upwork account sync for jobs, proposals, and messages.
- Fiverr account sync for gigs, orders, and conversations.
- Personal companion tools for reminders and workflow optimization.

## Next build steps

- Replace mock dashboard data with Firebase reads and writes.
- Add authentication and protected user workspaces.
- Add marketplace OAuth or API-based connection flows where available.

## Make it public

To let other people use it, you need to deploy it from your computer to a public hosting platform instead of running only on `127.0.0.1`.

Typical path:

1. Push this project to GitHub.
2. Deploy the Flask app on a cloud host such as Render, Railway, or an Azure/Linux VM.
3. Use the included `Procfile` as the start command base.
4. Store Firebase and API secrets in the hosting platform environment variables.
5. Share the public URL with users.

Important:

- `127.0.0.1` only works on your own machine.
- This app now syncs its workspace data with Firebase Realtime Database.
- Anyone using the same deployed app and same workspace id will see the same shared data.
- If you want user accounts, we should add Firebase Authentication next.

## Shared workspace

- By default the app uses the Firebase workspace id `shared-demo`.
- You can open a custom shared workspace with a URL like `http://127.0.0.1:5000/projects?workspace=my-team`.
- When deployed publicly, that same workspace id can be shared with your team or your clients.

## Deploy on Render

Official Render docs for Flask recommend:
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`

This repo now includes both:
- `gunicorn` in `requirements.txt`
- `render.yaml` for a Render web service blueprint

To deploy:

1. Sign in to [Render](https://render.com/)
2. Choose `New` -> `Blueprint`
3. Connect GitHub and select this repo:
   [https://github.com/ruthvik0404-maker/FF](https://github.com/ruthvik0404-maker/FF)
4. Render should detect `render.yaml`
5. Approve the service creation and deploy

Primary sources:
- [Deploy a Flask App on Render](https://render.com/docs/deploy-flask)
- [Render Web Services](https://render.com/docs/web-services)
