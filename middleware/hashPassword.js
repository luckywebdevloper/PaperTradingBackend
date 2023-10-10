import bcrypt from "bcryptjs";

const encrypt = (password) => {
  return new Promise(async (resolve, reject) => {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      resolve(hashPassword);
    } catch (error) {
      reject(error);
    }
  });
};

const compare = (password, userPassword) => {
  return new Promise(async (resolve, reject) => {
    try {
      const validPass = await bcrypt.compare(password, userPassword);
      resolve(validPass);
    } catch (error) {
      reject(error);
    }
  });
};

const hashPassword = {
  encrypt,
  compare,
};

export default hashPassword;
