import moment from "moment";

export default function isBeforeGivenDay(next5DaysDate) {
  const currentDate = moment();
  const futureDate = moment(next5DaysDate);

  return currentDate.isBefore(futureDate, "day");
}
