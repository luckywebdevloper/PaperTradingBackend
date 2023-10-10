import { OAuth2Client } from "google-auth-library";
import config from "../configuration/app.config.js";

const client = new OAuth2Client(String(config.GOOGLE_CLIENT_ID));

const initialize = async (accessToken) => {
    try {
      const ticket = await client.verifyIdToken({ idToken: accessToken }),
        payload = ticket.getPayload();
      return payload;
    } catch (error) {
      console.trace(error);
      return false;
    }
  },
  googleExternal = { initialize };

// export default googleExternal;
export default googleExternal;
