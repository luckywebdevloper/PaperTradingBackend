const validatePhoneNumber = (number) => {
  const phoneNumberRegex = /^\d{10}$/;
  const validate = phoneNumberRegex.test(number);
  return validate;
};

export default { validatePhoneNumber };
