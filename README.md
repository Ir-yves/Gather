# Streamline

A React + Express + MySQL community app with role-based admin tools, protected member pages, persistent chat, and LiveKit Cloud livestreams.

## Requirements

- Node.js 20+
- MySQL 8+
- A LiveKit Cloud project (for livestream video)

## Setup

1. Install dependencies from the project root with `npm install`.
2. Create the database and tables by running `server/schema.sql` with your MySQL client. For an existing installation, run migrations `001_content_assets.sql`, `002_reactions.sql`, `003_analytics_views.sql`, `004_private_messages.sql`, `005_private_conversation_pairs.sql`, `006_group_conversations_and_replies.sql`, and `007_account_and_site_settings.sql` in order.
3. Copy `server/.env.example` to `server/.env`, then set the MySQL credentials, a unique long `JWT_SECRET`, and the LiveKit URL/key/secret.
4. Create an admin account by registering normally, then promote that account in MySQL:

   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
   ```

5. Start both apps with `npm run dev`. The client starts at `http://localhost:5173` (or the next available port); the API starts at port `4000` (or the next available port). The client discovers the API port automatically and uses it for both API requests and chat.

The client uses the LiveKit Cloud URL from the API configuration. Admins can start a broadcast from the Live page, publish their camera/microphone or share their screen, and end the room for everyone. Keep the admin Live page open during the broadcast. Logged-in members see the active room on their community page and can join as viewers; regular member tokens cannot publish. LiveKit credentials and room tokens are never exposed to the browser as API secrets.

## Production deployment (Vercel, Render, and Aiven)

The repository includes a Vercel configuration for the client and a Render Blueprint for the API. The Render Blueprint uses a paid Starter web service and a 1 GB persistent disk for uploaded documents/videos; without persistent storage, uploads would be lost when Render replaces the service.

1. Push this repository to GitHub and import it into Vercel and Render from the repository root.
2. In Aiven, use a MySQL service and create the application database. Apply `server/schema.sql`, followed by migrations `001_content_assets.sql` through `007_account_and_site_settings.sql` in numeric order. Set the Aiven hostname, port, username, password, and database name in the Render service environment.
3. Download the Aiven CA certificate and set its contents as `MYSQL_SSL_CA` in Render. The API requires this certificate in production and verifies the database TLS connection.
4. Configure the Render Blueprint’s `CLIENT_ORIGIN` as the exact deployed Vercel origin (scheme and hostname, with no trailing path). Set the LiveKit URL, API key, and secret in Render if livestreaming is enabled. Keep provider secrets in their dashboards, never in Git.
5. In Vercel, set `VITE_API_URL` to `https://<render-host>/api` and `VITE_SOCKET_URL` to `https://<render-host>`, then redeploy the client. The Vercel rewrite serves the React app for client-side routes.
6. To use custom domains, point the Vercel and Render hostnames at subdomains of the same domain and update `CLIENT_ORIGIN`, `VITE_API_URL`, and `VITE_SOCKET_URL` to those final HTTPS origins. The default Vercel and Render hostnames are cross-site; the API uses `SameSite=None; Secure` cookies for that setup, but browser third-party-cookie restrictions may still interfere with sign-in. Same-site custom subdomains are recommended.
7. Verify the API at `https://<render-host>/health`, then register the initial account and promote it to admin using the SQL statement above.

The Render service exposes the API and Socket.IO from the same origin. Vercel's `VITE_API_URL` and `VITE_SOCKET_URL` are build-time variables, so set them before each production build. Configure Aiven's network access to permit connections from Render; use Aiven's documented access-control settings rather than opening the database to all sources where possible.

Admins can attach up to five documents or videos to each community update. Members can open videos, PDFs, TXT, and DOCX files in an in-app viewer; other Office formats can be downloaded and opened in a compatible app. Supported uploads include PDF, Office documents, TXT/RTF, MP4, and WebM, with a 100 MB per-file limit. Uploaded files are stored under `server/uploads`, validated by extension, MIME type, and file signature, and served only to logged-in users when the associated update is published (admins can also access drafts).

Logged-in members can like or unlike community updates, individual documents and videos, and the active livestream. Likes are stored per user and retained as counts.

Admins can review unique-member views, like counts, and the members who liked each update, attachment, or livestream from **Views & likes**. A feed view is recorded when the member feed loads; document/video views are recorded when a file is opened (downloads are not counted); a livestream view is recorded after a member connects successfully. Repeated views by the same member count once per item.

Members and admins can privately message active accounts from **Private messages**. Admins can create named group conversations with active members; participants can reply to messages, and messages can be forwarded to up to 20 members at a time. Participants can delete private messages for everyone in that conversation; members can delete their own community-room messages, and admins can moderate any community-room message.

Admins and members can update their profile, password, appearance, and in-app notification preferences from **Settings**. Admins can also update the site name and member welcome message; member account roles and activation remain managed from **Members**. In-app notifications are available for private messages, newly published content, and livestreams.

## Security notes

- Authentication uses bcrypt password hashes and short-lived JWTs in `HttpOnly`, `SameSite=Strict` cookies.
- Production must use HTTPS and set `COOKIE_SECURE=true`.
- The API validates the browser origin, validates request bodies, and checks roles on protected routes and Socket.IO connections.
- Public registration always creates a regular member. Promote the initial admin directly in the database; never make role assignment a public registration option.
