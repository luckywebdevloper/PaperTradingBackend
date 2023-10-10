import axios from "axios";
import messageHelpers from "../helpers/message.helpers.js";
const {
  URLS: { FB_ME_PIC_URL, FB_ME_URL, FB_ME_SCOPES, FB_ME_PIC_SCOPES },
} = messageHelpers;

const initialize = async (accessToken) => {
  try {
    return {
      ...(await axios.get(FB_ME_URL, {
        params: {
          fields: FB_ME_SCOPES,
          access_token: accessToken,
        },
      })),
      picture: (
        await axios.get(FB_ME_PIC_URL, {
          params: {
            fields: FB_ME_PIC_SCOPES,
            redirect: false,
            access_token: accessToken,
          },
        })
      )?.data?.data?.url,
    };
  } catch (error) {
    console.trace(error);
    return false;
  }
};
const facebookExternal = { initialize };

export default facebookExternal;
