import React from "react";
import "./searchBox.css";
import { SearchBoxProps, SearchBoxState } from "./interface";
import { ConfigService } from "../../assets/lib/kookit-extra-browser.min";
import ConfigUtil from "../../utils/file/configUtil";
import BookUtil from "../../utils/file/bookUtil";
import DatabaseService from "../../utils/storage/databaseService";
import ReplaceUtil from "../../utils/reader/replaceUtil";
import ReplaceRule from "../../models/ReplaceRule";

class SearchBox extends React.Component<SearchBoxProps, SearchBoxState> {
  constructor(props: SearchBoxProps) {
    super(props);
    this.state = {
      isFocused: false,
    };
  }
  componentDidMount() {
    if (this.props.isNavSearch) {
      let searchBox: any = document.querySelector(".header-search-box");
      searchBox && searchBox.focus();
    }
  }
  handleMouse = async () => {
    let value = (this.refs.searchBox as any).value;
    if (this.props.isNavSearch) {
      value && this.search(value);
    }
    this.setState({ isFocused: false });
    if (this.props.mode === "nav") {
      this.props.handleNavSearchState("searching");
    }
    let keyword = (
      document.querySelector(".header-search-box") as HTMLInputElement
    ).value.toLowerCase();
    let results = await this.handleGetSearchResults(keyword);
    if (results) {
      this.props.handleSearchResults(results);
      this.props.handleSearch(true);
      if (this.props.mode === "nav") {
        this.props.handleNavSearchState("done");
      }
    }
  };
  handleGetSearchResults = async (keyword: string) => {
    let results =
      this.props.tabMode === "note"
        ? await ConfigUtil.searchNotesByKeyword(keyword, "", "note")
        : this.props.tabMode === "highlight"
          ? await ConfigUtil.searchNotesByKeyword(keyword, "", "highlight")
          : await BookUtil.searchBooksByKeyword(keyword);
    let deletedBookKeys = ConfigService.getAllListConfig("deletedBooks");
    results = results.filter((result: any) => {
      return !deletedBookKeys.includes(
        result[
          this.props.tabMode === "note" || this.props.tabMode === "highlight"
            ? "bookKey"
            : "key"
        ]
      );
    });
    return results;
  };

  handleKey = async (event: any) => {
    if (event.keyCode !== 13) {
      return;
    }
    let value = (this.refs.searchBox as any).value;
    if (this.props.isNavSearch || this.props.isReading) {
      value && this.search(value);
    }
    this.setState({ isFocused: false });
    if (event && event.keyCode === 13) {
      let keyword = event.target.value.toLowerCase();
      let results = await this.handleGetSearchResults(keyword);
      if (results) {
        this.props.handleSearchResults(results);
        this.props.handleSearch(true);
        if (this.props.mode === "nav") {
          this.props.handleNavSearchState("done");
        }
      }
    }
  };
  search = async (q: string) => {
    this.props.handleNavSearchState("searching");
    
    // 加载替换规则
    let replaceRules: any[] = [];
    try {
      const allRules: ReplaceRule[] = await DatabaseService.getAllRecords(
        "replaceRules"
      );
      const bookKey = this.props.htmlBook?.key || "";
      
      // 加载全局规则
      const globalRules = allRules.filter(
        (r: ReplaceRule) => r.scope === "all" && r.isEnabled
      );
      // 加载书籍专属规则
      const bookRules = allRules.filter(
        (r: ReplaceRule) =>
          r.bookKey === bookKey && r.scope === "current" && r.isEnabled
      );
      // 合并规则
      const mergedRules = [...globalRules, ...bookRules];
      replaceRules = ReplaceUtil.buildParsedRules(mergedRules);
    } catch (error) {
      console.error("Failed to load replace rules for search:", error);
    }

    // 执行搜索
    let searchList = await this.props.htmlBook.rendition.doSearch(q);
    
    // 如果有替换规则，也搜索原始词
    if (replaceRules.length > 0) {
      const originalTerms = ReplaceUtil.reverseSearch(q, replaceRules);
      for (const originalTerm of originalTerms) {
        if (originalTerm && originalTerm !== q) {
          const additionalResults = await this.props.htmlBook.rendition.doSearch(originalTerm);
          // 合并结果，避免重复
          for (const result of additionalResults) {
            const isDuplicate = searchList.some(
              (existing: any) => 
                existing.cfi === result.cfi || 
                (existing.chapterDocIndex === result.chapterDocIndex && 
                 existing.excerpt === result.excerpt)
            );
            if (!isDuplicate) {
              searchList.push(result);
            }
          }
        }
      }
    }

    this.props.handleNavSearchState("pending");
    
    // Sort search results by book order (chapter index, then text position)
    searchList.sort((a: any, b: any) => {
      // First, sort by chapter index
      const chapterDiff = (a.chapterDocIndex || 0) - (b.chapterDocIndex || 0);
      if (chapterDiff !== 0) {
        return chapterDiff;
      }
      
      // If same chapter, try to sort by text position in excerpt
      // Parse CFI to get more precise ordering if available
      try {
        const cfiA = JSON.parse(a.cfi);
        const cfiB = JSON.parse(b.cfi);
        
        // If both have percentage, use that for ordering within chapter
        if (cfiA.percentage !== undefined && cfiB.percentage !== undefined) {
          return cfiA.percentage - cfiB.percentage;
        }
        
        // If both have count, use that
        if (cfiA.count !== undefined && cfiB.count !== undefined) {
          return cfiA.count - cfiB.count;
        }
      } catch (e) {
        // If CFI parsing fails, keep original order
      }
      
      return 0;
    });
    
    this.props.handleSearchList(
      searchList.map((item: any) => {
        const regex = new RegExp(
          q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "gi"
        );
        // 对搜索结果的摘录应用替换规则（显示替换后的内容）
        let excerpt = item.excerpt;
        if (replaceRules.length > 0) {
          excerpt = ReplaceUtil.applyRulesToSearchResult(excerpt, replaceRules);
        }
        item.excerpt = excerpt.replace(
          regex,
          `<span class="content-search-text">$&</span>`
        );
        return item;
      })
    );
    this.props.handleNavSearchState("done");
  };

  handleCancel = () => {
    if (this.props.isNavSearch) {
      this.props.handleSearchList(null);
      this.props.handleNavSearchState("done");
    }
    this.props.handleSearch(false);
    (document.querySelector(".header-search-box") as HTMLInputElement).value =
      "";
  };

  render() {
    return (
      <div style={{ position: "relative" }}>
        <input
          type="text"
          ref="searchBox"
          className="header-search-box"
          onKeyDown={(event) => {
            this.handleKey(event);
          }}
          onFocus={() => {
            this.setState({ isFocused: true });

            if (this.props.mode === "nav") {
              this.props.handleNavSearchState("focused");
            }
          }}
          placeholder={
            this.props.isNavSearch || this.props.mode === "nav"
              ? this.props.t("Search in the Book")
              : this.props.tabMode === "note"
                ? this.props.t("Search my notes")
                : this.props.tabMode === "highlight"
                  ? this.props.t("Search my highlights")
                  : this.props.t("Search my library")
          }
          style={
            this.props.mode === "nav"
              ? {
                  width: this.props.width,
                  height: this.props.height,
                  paddingRight: "30px",
                }
              : {}
          }
          onCompositionStart={() => {
            if (this.props.mode === "nav") {
              this.props.handleNavSearchState("focused");
            }
            if (this.props.isNavLocked) {
              return;
            } else {
              ConfigService.setReaderConfig("isTempLocked", "yes");
              ConfigService.setReaderConfig("isNavLocked", "yes");
            }
          }}
          onCompositionEnd={() => {
            if (ConfigService.getReaderConfig("isTempLocked") === "yes") {
              ConfigService.setReaderConfig("isNavLocked", "");
              ConfigService.setReaderConfig("isTempLocked", "");
            }
          }}
        />
        {this.props.isSearch && !this.state.isFocused ? (
          <span
            className="header-search-text"
            onClick={() => {
              this.handleCancel();
            }}
            style={
              this.props.mode === "nav" ? { right: "-9px", top: "14px" } : {}
            }
          >
            <span className="icon-close theme-color-delete"></span>
          </span>
        ) : (
          <span
            className="header-search-text"
            onClick={() => {
              this.handleMouse();
            }}
          >
            <span
              className="icon-search header-search-icon"
              style={this.props.mode === "nav" ? { right: "5px" } : {}}
            ></span>
          </span>
        )}
      </div>
    );
  }
}

export default SearchBox;
