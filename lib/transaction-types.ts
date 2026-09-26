export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionCategoryOption = {
  id: string;
  name: string;
  icon: string | null;
  type: TransactionType;
};

export type TransactionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};
