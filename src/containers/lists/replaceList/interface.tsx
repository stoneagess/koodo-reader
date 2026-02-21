import Book from "../../../models/Book";

export interface ReplaceListProps {
  currentBook: Book;
  t: (title: string) => string;
  renderBookFunc: () => void;
}

export interface ReplaceListState {
  scope: string;
  rulesText: string;
  isDirty: boolean;
  savedRulesText: string;
}
