import React from "react";
import "./navigationPanel.css";
import ContentList from "../../lists/contentList";
import BookNavList from "../../lists/navList";
import { Trans } from "react-i18next";
import { NavigationPanelProps, NavigationPanelState } from "./interface";
import SearchBox from "../../../components/searchBox";
import Parser from "html-react-parser";
import DOMPurify from "dompurify";
import EmptyCover from "../../../components/emptyCover";
import { ConfigService } from "../../../assets/lib/kookit-extra-browser.min";
import CoverUtil from "../../../utils/file/coverUtil";

class NavigationPanel extends React.Component<
  NavigationPanelProps,
  NavigationPanelState
> {
  constructor(props: NavigationPanelProps) {
    super(props);
    this.state = {
      currentTab: "contents",
      chapters: [],
      searchState: "",
      searchList: null,
      startIndex: 0,
      currentIndex: 0,
      cover: "",
      isCoverExist: false,
    };
  }
  handleNavSearchState = (state: string) => {
    this.setState({ searchState: state });
    if (state === "searching") {
      this.setState({
        searchList: null,
        startIndex: 0,
        currentIndex: 0,
      });
    }
    if (state) {
      this.props.handleSearch(true);
    } else {
      if (ConfigService.getReaderConfig("isNavLocked") !== "yes") {
        this.props.handleSearch(false);
      }
    }
  };
  handleSearchList = (searchList: any) => {
    this.setState({ searchList });
  };
  async UNSAFE_componentWillReceiveProps(nextProps: NavigationPanelProps) {
    if (nextProps.currentBook.key !== this.props.currentBook.key) {
      let cover = await CoverUtil.getCover(nextProps.currentBook);
      let isCoverExist = await CoverUtil.isCoverExist(nextProps.currentBook);
      this.setState({
        cover,
        isCoverExist,
      });
    }
  }
  componentDidMount() {
    this.props.handleFetchBookmarks();
  }

  handleChangeTab = (currentTab: string) => {
    this.setState({ currentTab });
  };
  handleLock = () => {
    this.props.handleNavLock(!this.props.isNavLocked);
    ConfigService.setReaderConfig(
      "isNavLocked",
      !this.props.isNavLocked ? "yes" : "no"
    );
    this.props.renderBookFunc();
  };
  renderSearchList = () => {
    if (!this.state.searchList[0]) {
      return (
        <div className="navigation-panel-empty-bookmark">
          <Trans>Empty</Trans>
        </div>
      );
    }
    return this.state.searchList.map((item: any, index: number) => {
      let bookLocation = JSON.parse(item.cfi) || {};
      return (
        <li
          className="nav-search-list-item"
          key={item.text}
          onClick={async () => {
            await this.props.htmlBook.rendition.goToPosition(
              JSON.stringify({
                text: bookLocation.text,
                chapterTitle: bookLocation.chapterTitle,
                chapterDocIndex: bookLocation.chapterDocIndex,
                chapterHref: bookLocation.chapterHref,
                count: bookLocation.hasOwnProperty("cfi")
                  ? "ignore"
                  : bookLocation.count,
                percentage: bookLocation.percentage,
                cfi: bookLocation.cfi,
                page: bookLocation.page,
              })
            );
            let style = "background: #f3a6a68c;";
            this.props.htmlBook.rendition.highlightSearchNode(
              bookLocation.keyword,
              style
            );
          }}
        >
          <span style={{ marginRight: "5px", opacity: 0.6 }}>
            {index + 1}.
          </span>
          {Parser(DOMPurify.sanitize(item.excerpt))}
          <span
            style={{
              fontSize: "12px",
              opacity: 0.6,
              marginLeft: "10px",
            }}
          >
            {bookLocation.chapterTitle}
          </span>
        </li>
      );
    });
  };

  render() {
    const searchProps = {
      mode: this.state.searchState ? "" : "nav",
      width: "100px",
      height: "35px",
      isNavSearch: this.state.searchState,
      handleNavSearchState: this.handleNavSearchState,
      handleSearchList: this.handleSearchList,
    };
    return (
      <div
        className="navigation-panel"
        style={{
          backgroundColor: this.props.isNavLocked
            ? this.props.backgroundColor
            : "",
          color: this.props.isNavLocked
            ? ConfigService.getReaderConfig("textColor")
            : "",
        }}
        onMouseLeave={(event) => {
          if (this.state.searchState && this.state.searchState !== "done") {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {this.state.searchState ? (
          <>
            <div
              className="nav-close-icon"
              onClick={() => {
                this.handleNavSearchState("");
                this.props.handleSearch(false);
                this.setState({ searchList: null });
              }}
            >
              <span className="icon-close theme-color-delete"></span>
            </div>

            <div className="header-search-container">
              <div
                className="navigation-search-title"
                style={{ height: "20px", margin: "0px 25px 13px" }}
              >
                <Trans>Search in the Book</Trans>
              </div>
              <SearchBox {...searchProps} />
            </div>
            <ul className="nav-search-list">
              {this.state.searchState === "searching" ? (
                <div className="loading-animation search-animation">
                  <div className="loader"></div>
                </div>
              ) : this.state.searchList ? (
                this.renderSearchList()
              ) : null}
            </ul>
          </>
        ) : (
          <>
            <div className="navigation-header">
              <span
                className={
                  this.props.isNavLocked
                    ? "icon-lock nav-lock-icon"
                    : "icon-unlock nav-lock-icon"
                }
                onClick={() => {
                  this.handleLock();
                }}
              ></span>

              {this.state.isCoverExist ? (
                <img className="book-cover" src={this.state.cover} alt="" />
              ) : (
                <div className="book-cover">
                  <EmptyCover
                    {...{
                      format: this.props.currentBook.format,
                      title: this.props.currentBook.name,
                      scale: 0.86,
                    }}
                  />
                </div>
              )}

              <p className="book-title">{this.props.currentBook.name}</p>
              <p className="book-arthur">
                <Trans>Author</Trans>:{" "}
                <Trans>
                  {this.props.currentBook.author || "Unknown author"}
                </Trans>
              </p>
              <span className="reading-duration">
                <Trans>Reading time</Trans>:{" "}
                {Math.floor(this.props.totalDuration / 60)}
                &nbsp; min
              </span>
              <div className="navigation-search-box">
                <SearchBox {...searchProps} />
              </div>

              <div className="navigation-navigation">
                <span
                  className="book-bookmark-title"
                  onClick={() => {
                    this.handleChangeTab("contents");
                  }}
                  style={
                    this.state.currentTab === "contents" ? {} : { opacity: 0.5 }
                  }
                >
                  <Trans>Content</Trans>
                </span>
                <span
                  className="book-bookmark-title"
                  style={
                    this.state.currentTab === "bookmarks"
                      ? {}
                      : { opacity: 0.5 }
                  }
                  onClick={() => {
                    this.handleChangeTab("bookmarks");
                  }}
                >
                  <Trans>Bookmark</Trans>
                </span>
                <span
                  className="book-bookmark-title"
                  style={
                    this.state.currentTab === "notes" ? {} : { opacity: 0.5 }
                  }
                  onClick={() => {
                    this.handleChangeTab("notes");
                  }}
                >
                  <Trans>Note</Trans>
                </span>
                <span
                  className="book-bookmark-title"
                  style={
                    this.state.currentTab === "highlights"
                      ? {}
                      : { opacity: 0.5 }
                  }
                  onClick={() => {
                    this.handleChangeTab("highlights");
                  }}
                >
                  <Trans>Highlight</Trans>
                </span>
              </div>
            </div>
            <div className="navigation-body-parent">
              <div className="navigation-body">
                {this.state.currentTab === "contents" ? (
                  <ContentList />
                ) : (
                  <BookNavList {...{ currentTab: this.state.currentTab }} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
}

export default NavigationPanel;
