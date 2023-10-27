import moment from "moment-timezone";

const isBetween915AMAnd320PM = () => {
  const currentTimeIST = moment().tz("Asia/Kolkata");
  const startOfTodayIST = currentTimeIST
    .clone()
    .startOf("day")
    .hour(9)
    .minute(15);
  const endOfTodayIST = currentTimeIST
    .clone()
    .startOf("day")
    .hour(15)
    .minute(20);

  return currentTimeIST.isBetween(startOfTodayIST, endOfTodayIST);
};

export default isBetween915AMAnd320PM;
