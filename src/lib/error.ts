// import axios from "./axios";

// export const getStatistics = async () => {
//   return axios.get("/reports/statistics");
// };
export async function getStatistics() {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/reports/public/booking-stats`
  );
  const data = await res.json();
  return data;
}