import { useEffect, useState } from "react";
import axios from "axios";

export const useServerPagination = (url: string, itemsPerPage = 10) => {
  const [data, setData] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    axios.get(url, { params: { page, limit: itemsPerPage } }).then((res) => {
      setData(res.data.items);
      setTotalPages(res.data.totalPages);
    });
  }, [page]);

  return { data, page, totalPages, setPage };
};
