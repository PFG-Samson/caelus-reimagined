# Security Guidelines

## Secret Management

This project uses environment variables to manage API keys and credentials. 

### Critical Security Rule
> [!CAUTION]
> **NEVER** prefix sensitive API keys (like OpenAI, Hugging Face, or Database credentials) with `VITE_`.

In Vite, any environment variable prefixed with `VITE_` is automatically bundled into the client-side JavaScript. This means anyone who visits your website can see and steal these keys.

### Sensitive vs. Public Keys

| Key Type | Variable Prefix | Intent | Storage Location |
| :--- | :--- | :--- | :--- |
| **Sensitive** | *None* (e.g., `OPENAI_API_KEY`) | Should stay on the server | Server components / Serverless functions |
| **Public** | `VITE_` (e.g., `VITE_MAP_KEY`) | Necessary for browser APIs | Client-side code |

## How to use Sensitive Keys

Since this project is currently a frontend-only application, sensitive keys cannot be used directly without a backend proxy.

1. **Move logic to a backend**: Create a server-side endpoint (e.g., using Node.js, Vercel Functions, or Netlify Functions).
2. **Access variables**: Use `process.env.OPENAI_API_KEY` in your server-side environment.
3. **Frontend call**: Have your frontend call your own backend endpoint instead of the third-party API directly.

## Credential Rotation

If you accidentally commit a `.env` file or deploy with `VITE_` prefixed sensitive keys:
1. Revoke the key in the provider's dashboard (OpenAI, Hugging Face, etc.).
2. Generate a new key.
3. Update your server environment variables.
