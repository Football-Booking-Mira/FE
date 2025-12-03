// import axios from "./axios";

// export const getStatistics = async () => {
//   return axios.get("/reports/statistics");
// };
export async function getStatistics() {
  const res = await fetch("http://localhost:3000/api/reports/public/booking-stats");
  const data = await res.json();
  return data;
}