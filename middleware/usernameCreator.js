const userNameCreator = (name) => {
  let userNameCode = Math.floor(1000 + Math.random() * 90000);
  const userName = name.toLocaleLowerCase().replace(/ /g, "") + userNameCode;
  return userName;
};

export default userNameCreator;
