import { connect } from "react-redux";
import { stateType } from "../../../store";
import ReplaceList from "./component";
import { withTranslation } from "react-i18next";

const mapStateToProps = (state: stateType) => {
  return {
    currentBook: state.book.currentBook,
    renderBookFunc: state.book.renderBookFunc,
  };
};

const actionCreator = {};

export default connect(
  mapStateToProps,
  actionCreator
)(withTranslation()(ReplaceList) as any);
