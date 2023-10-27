import moment from "moment";

export default function next5DayDate(inputTimestamp) {
  const startDate = moment(inputTimestamp);

  const endDate = startDate.add(5, "days");

  endDate.startOf("day");

  const formattedTimestamp = endDate.format();

  return formattedTimestamp;
}
