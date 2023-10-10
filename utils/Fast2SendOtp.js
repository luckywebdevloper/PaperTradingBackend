import fast2sms from "fast-two-sms";

const Fast2SendOtp = ({ message, contactNumber }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fast2sms.sendMessage({
        authorization: process.env.FAST2SMS,
        message,
        numbers: [contactNumber],
        // showLogs: true,
      });
      resolve(res);
    } catch (error) {
      reject(error);
    }
  });
};

export default Fast2SendOtp;
