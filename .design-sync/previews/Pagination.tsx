import { useState } from "react";
import { Pagination } from "bloomy-design-space";

export const Inicio = () => {
  const [page, setPage] = useState(1);
  return <Pagination meta={{ currentPage: page, totalPages: 12 }} onPaginate={setPage} />;
};

export const Meio = () => <Pagination meta={{ currentPage: 6, totalPages: 12 }} onPaginate={() => {}} />;

export const Fim = () => <Pagination meta={{ currentPage: 12, totalPages: 12 }} onPaginate={() => {}} />;

export const PoucasPaginas = () => <Pagination meta={{ currentPage: 2, totalPages: 3 }} onPaginate={() => {}} />;
