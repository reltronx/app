import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import initHelpHero from 'helphero';

import * as pageDefaults from '../../constants/pageConstants';

import ConfirmUser from './Modal/ConfirmUser/ConfirmUser.jsx';
import ExamplesModal from './Modal/ExamplesModal/ExamplesModal.jsx';
import Login from './Modal/Login/Login.jsx';
import Modal from './Modal/Modal.jsx';
import PasswordForgot from './Modal/PasswordForgot/PasswordForgot.jsx';
import ShareModal from './Modal/ShareModal/ShareModal.jsx';
import SignUp from './Modal/SignUp/SignUp.jsx';
import PagesList from './Modal/PagesList/PagesList.jsx';
import PasswordReset from './Modal/PasswordReset/PasswordReset.jsx';
import Welcome from './Modal/Welcome/Welcome.jsx';

import Canvas from './Canvas/Canvas.jsx';
import MainToolbar from './MainToolbar/MainToolbar.jsx';
import Navigation from './Navigation/Navigation.jsx';
import Workspace from './Workspace/Workspace.jsx';

import * as editorActions from '../../action/editors.js';
import * as mainToolbarActions from '../../action/mainToolbar.js';
import * as navigationActions from '../../action/navigation.js';
import * as pageActions from '../../action/page.js';
import * as preferencesActions from '../../action/preferences.js';
import * as userActions from '../../action/user.js';
import { loadWorkspace } from '../../action/workspace.js';

import axios from '../../utils/axios';

class App extends React.Component {
  componentWillMount() {
    this.onUserVisit();
    if (performance.navigation.type === 2) {
      location.reload(true);
    }
  }

  componentDidMount() {
    this.authAndLoadPage();
    if (this.projectID() === 'QJSEsqTOS') {
      const hlp = initHelpHero('1Dyo05WliMY');
      hlp.anonymous();
    }
  }

  onKeyPressed(e) {
    if (e.metaKey || e.ctrlKey) {
      switch (e.keyCode) {
        case 78: // n,N
          // new
          break;
        case 79: // o,O
          this.props.viewPagesModal();
          e.preventDefault();
          break;
        case 83: // s,S
          this.savePage();
          e.preventDefault();
          break;
        default:
          break;
      }
    }
  }


  onUserVisit =() => {
    const isUserFirstVisit = localStorage.getItem(process.env.LOCALSTORAGE_VARIABLE);
    // check if it is the first visit
    if (isUserFirstVisit === null || isUserFirstVisit === '') {
    // set variable to 1
      localStorage.setItem(process.env.LOCALSTORAGE_VARIABLE, 1);
      this.props.viewWelcomeModal();
    }
  }

  projectID = () => {
    const location = this.props.location.pathname;
    const projectID = location.match(/\/pebl\/([\w-].*)/);
    return projectID ? projectID[1] : null;
  }

  resetPage = () => {
    const location = this.props.location.pathname;
    const tokenID = location.match(/\/reset\/([\w-].*)/);
    return tokenID ? tokenID[1] : null;
  }

  userConfirmation = () => {
    const location = this.props.location.pathname;
    const tokenID = location.match(/\/confirmation/);
    return tokenID ? true : null;
  }

  authAndLoadPage = () => {
    if (this.userConfirmation()) {
      this.props.viewConfirmUserModal();
    } else if (this.resetPage()) {
      this.props.viewResetModal();
    } else if (this.projectID()) {
      this.props.setEditAccess(false);
      const projectID = this.projectID();
      axios.get(`/pages/${projectID}`)
        .then((res) => {
          this.props.loadPage(res.data[0].id, res.data[0].title, res.data[0].heading, res.data[0].layout);
          this.props.loadEditors(res.data[0].editors, res.data[0].editorIndex);
          if (Object.keys(res.data[0].workspace).length > 0) {
            this.props.loadWorkspace(res.data[0].workspace);
          }
          this.props.setPreviewMode(true);
          this.loadNavigation();
          axios.get(`/authenticate/${projectID}`)
            .then((res1) => {
              this.props.setEditAccess(res1.data);
            });
        });
    }
    this.props.fetchCurrentUser()
      .then(() => {
        this.props.fetchUserPreferences();
      });
  }

  authLoadedPage = () => {
    if (this.projectID()) {
      this.props.setEditAccess(false);
      const projectID = this.projectID();
      axios.get(`/authenticate/${projectID}`)
        .then((res1) => {
          this.props.setEditAccess(res1.data);
        });
    }
  }

  savePage = () => {
    if (this.props.name) {
      let title = this.props.pageTitle;
      if (this.props.pageHeading !== '') {
        title =
        (this.props.pageTitle === pageDefaults.DEFAULT_PAGE_TITLE)
          ? this.props.pageHeading : this.props.pageTitle;
      }
      if (this.props.id.length === 0) {
        this.props.submitPage(
          '',
          title,
          this.props.pageHeading,
          this.props.editors,
          this.props.editorIndex,
          this.props.layout,
          'save',
          this.props.workspace,
          true
        );
      } else if (this.props.canEdit) {
        this.props.updatePage(
          this.props.id,
          title,
          this.props.pageHeading,
          this.props.editors,
          this.props.editorIndex,
          this.props.layout,
          this.props.workspace
        );
      } else {
        // this is for fork and save
        this.props.submitPage(
          this.props.id,
          `${this.props.pageTitle}-copy`,
          this.props.pageHeading,
          this.props.editors,
          this.props.editorIndex,
          this.props.layout,
          'fork',
          this.props.workspace,
          true
        );
      }
    } else {
      this.props.viewLoginModal();
    }
  }

  loadNavigation = () => {
    this.props.createNavigationContent(this.props.layout);
  }

  render() {
    return (
      <div
        role="presentation"
        tabIndex="0" // eslint-disable-line
        onKeyDown={e => this.onKeyPressed(e)} // eslint-disable-line
      >
        <nav className="main-nav">
          <MainToolbar
            addCodeEditor={this.props.addCodeEditor}
            addTextEditor={this.props.addTextEditor}
            addQuestionEditor={this.props.addQuestionEditor}
            addIframe={this.props.addIframe}
            addImage={this.props.addImage}
            canEdit={this.props.canEdit}
            createNavigationContent={this.props.createNavigationContent}
            isFileDropdownOpen={this.props.isFileDropdownOpen}
            isHelpDropdownOpen={this.props.isHelpDropdownOpen}
            isAccountDropdownOpen={this.props.isAccountDropdownOpen}
            isPreferencesPanelOpen={this.props.isPreferencesPanelOpen}
            layout={this.props.layout}
            logoutUser={this.props.logoutUser}
            name={this.props.name}
            pageHeading={this.props.pageHeading}
            pageTitle={this.props.pageTitle}
            preview={this.props.preview}
            projectID={this.projectID}
            setPageTitle={this.props.setPageTitle}
            savePage={this.savePage}
            editorAutoSave={this.props.editorAutoSave}
            toggleFileDropdown={this.props.toggleFileDropdown}
            toggleHelpDropdown={this.props.toggleHelpDropdown}
            toggleAccountDropdown={this.props.toggleAccountDropdown}
            togglePreviewMode={this.props.togglePreviewMode}
            togglePreferencesPanel={this.props.togglePreferencesPanel}
            unsavedChanges={this.props.unsavedChanges}
            autoSaveUnsavedChanges={this.props.autoSaveUnsavedChanges}
            userType={this.props.userType}
            viewExamplesModal={this.props.viewExamplesModal}
            viewPagesModal={this.props.viewPagesModal}
            viewLoginModal={this.props.viewLoginModal}
            viewShareModal={this.props.viewShareModal}
            viewSignUpModal={this.props.viewSignUpModal}
          />
        </nav>
        <Canvas
          editorFontSize={this.props.editorFontSize}
          editorTheme={this.props.editorTheme}

          pageHeading={this.props.pageHeading}
          setPageHeading={this.props.setPageHeading}

          layout={this.props.layout}
          name={this.props.name}
          preview={this.props.preview}
          rgl={this.props.rgl}
          setPageLayout={this.props.setPageLayout}
          editorIndex={this.props.editorIndex}
          textHeights={this.props.textHeights}
          currentWidget={this.props.currentWidget}

          updateFile={this.props.updateFile}
          editors={this.props.editors}
          setCurrentWidget={this.props.setCurrentWidget}
          removeEditor={this.props.removeEditor}
          duplicateEditor={this.props.duplicateEditor}
          setEditorSize={this.props.setEditorSize}
          setEditorPosition={this.props.setEditorPosition}
          setCurrentFile={this.props.setCurrentFile}
          addMediaFile={this.props.addMediaFile}

          playCode={this.props.playCode}
          stopCode={this.props.stopCode}
          startCodeRefresh={this.props.startCodeRefresh}
          stopCodeRefresh={this.props.stopCodeRefresh}
          clearConsoleOutput={this.props.clearConsoleOutput}
          updateConsoleOutput={this.props.updateConsoleOutput}

          setInnerWidth={this.props.setInnerWidth}

          updateTextChange={this.props.updateTextChange}
          updateImageChange={this.props.updateImageChange}
          updateTextBackColor={this.props.updateTextBackColor}

          setIframeURL={this.props.setIframeURL}

          setQuestionInnerHeight={this.props.setQuestionInnerHeight}
          updateQuestionChange={this.props.updateQuestionChange}
          updateAnswerChange={this.props.updateAnswerChange}

          setImageURL={this.props.setImageURL}
          resizeTextEditor={this.props.resizeTextEditor}
          updateTextHeight={this.props.updateTextHeight}

          isNavigationOpen={this.props.isNavigationOpen}
          openNavigationContent={this.props.openNavigationContent}
        />

        <Modal
          size="xlarge"
          isOpen={this.props.isPagesModalOpen}
          closeModal={this.props.closePagesModal}
        >
          <PagesList />
        </Modal>

        <Modal
          size="xlarge"
          isOpen={this.props.isExamplesModalOpen}
          closeModal={this.props.closeExamplesModal}
        >
          <ExamplesModal />
        </Modal>

        <Modal
          size="large"
          isOpen={this.props.isLoginModalOpen}
          closeModal={this.props.closeLoginModal}
        >
          <Login
            authLoadedPage={this.authLoadedPage}
            loginName={this.props.loginName}
            loginPassword={this.props.loginPassword}
            updateUserName={this.props.updateUserName}
            updateUserPassword={this.props.updateUserPassword}
            setUserName={this.props.setUserName}
            setUserType={this.props.setUserType}
            closeLoginModal={this.props.closeLoginModal}
            viewForgotModal={this.props.viewForgotModal}
            isForgotModalOpen={this.props.isForgotModalOpen}
            userType={this.props.userType}
          />
        </Modal>

        <Modal
          size="large"
          isOpen={this.props.isForgotModalOpen}
          closeModal={this.props.closeForgotModal}
        >
          <PasswordForgot
            isForgotModalOpen={this.props.isForgotModalOpen}
          />
        </Modal>

        <Modal
          size="large"
          isOpen={this.props.isResetModalOpen}
          closeModal={this.props.closeResetModal}
        >
          <PasswordReset
            isResetModalOpen={this.props.isResetModalOpen}
            location={this.props.location}
          />
        </Modal>

        <Modal
          size="auto"
          isOpen={this.props.isSignUpModalOpen}
          closeModal={this.props.closeSignUpModal}
        >
          <SignUp
            authLoadedPage={this.authLoadedPage}
            loginName={this.props.loginName}
            loginPassword={this.props.loginPassword}
            updateUserName={this.props.updateUserName}
            updateUserPassword={this.props.updateUserPassword}
            requiresGuardianConsent={this.props.requiresGuardianConsent}
            signUserUp={this.props.signUserUp}
            setGuardianConsent={this.props.setGuardianConsent}
            setUserName={this.props.setUserName}
            setUserType={this.props.setUserType}
            userType={this.props.userType}
            closeSignUpModal={this.props.closeSignUpModal}
          />
        </Modal>
        <Modal
          size="small"
          isOpen={this.props.isConfirmUserModalOpen}
          closeModal={this.props.closeConfirmUserModal}
        >
          <ConfirmUser
            location={this.props.location}
          />
        </Modal>
        <Modal
          size="small"
          isOpen={this.props.isShareModalOpen}
          closeModal={this.props.closeShareModal}
        >
          <ShareModal
            pageTitle={this.props.pageTitle}
          />
        </Modal>

        <Modal
          size="auto"
          isOpen={this.props.isWelcomeModalOpen}
          closeModal={this.props.closeWelcomeModal}
        >
          <Welcome />
        </Modal>
        <Navigation />
        <Workspace />
      </div>
    );
  }
}

App.propTypes = {
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired,
  editors: PropTypes.shape({}).isRequired,
  editorIndex: PropTypes.number.isRequired,
  currentWidget: PropTypes.string.isRequired,

  workspace: PropTypes.shape({}).isRequired,

  pageTitle: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  layout: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  rgl: PropTypes.shape({}).isRequired,
  preview: PropTypes.bool.isRequired,
  unsavedChanges: PropTypes.bool.isRequired,
  autoSaveUnsavedChanges: PropTypes.func.isRequired,
  textHeights: PropTypes.shape({}).isRequired,

  canEdit: PropTypes.bool.isRequired,
  loginName: PropTypes.string.isRequired,
  loginPassword: PropTypes.string.isRequired,

  // user
  name: PropTypes.string.isRequired,
  userType: PropTypes.string.isRequired,
  setUserName: PropTypes.func.isRequired,
  setUserType: PropTypes.func.isRequired,
  fetchCurrentUser: PropTypes.func.isRequired,
  requiresGuardianConsent: PropTypes.bool.isRequired,
  setGuardianConsent: PropTypes.func.isRequired,

  isFileDropdownOpen: PropTypes.bool.isRequired,
  isHelpDropdownOpen: PropTypes.bool.isRequired,
  isAccountDropdownOpen: PropTypes.bool.isRequired,
  isPagesModalOpen: PropTypes.bool.isRequired,
  isLoginModalOpen: PropTypes.bool.isRequired,
  isForgotModalOpen: PropTypes.bool.isRequired,
  isSignUpModalOpen: PropTypes.bool.isRequired,
  isResetModalOpen: PropTypes.bool.isRequired,

  isExamplesModalOpen: PropTypes.bool.isRequired,
  viewExamplesModal: PropTypes.func.isRequired,
  closeExamplesModal: PropTypes.func.isRequired,

  setCurrentWidget: PropTypes.func.isRequired,
  removeEditor: PropTypes.func.isRequired,
  duplicateEditor: PropTypes.func.isRequired,
  loadEditors: PropTypes.func.isRequired,
  loadWorkspace: PropTypes.func.isRequired,
  setEditorPosition: PropTypes.func.isRequired,
  setEditorSize: PropTypes.func.isRequired,
  addCodeEditor: PropTypes.func.isRequired,
  playCode: PropTypes.func.isRequired,
  stopCode: PropTypes.func.isRequired,
  startCodeRefresh: PropTypes.func.isRequired,
  stopCodeRefresh: PropTypes.func.isRequired,
  clearConsoleOutput: PropTypes.func.isRequired,
  updateConsoleOutput: PropTypes.func.isRequired,
  addMediaFile: PropTypes.func.isRequired,
  addTextEditor: PropTypes.func.isRequired,
  addQuestionEditor: PropTypes.func.isRequired,
  updateTextChange: PropTypes.func.isRequired,
  updateTextBackColor: PropTypes.func.isRequired,
  addIframe: PropTypes.func.isRequired,
  setIframeURL: PropTypes.func.isRequired,
  updateFile: PropTypes.func.isRequired,
  setCurrentFile: PropTypes.func.isRequired,
  setInnerWidth: PropTypes.func.isRequired,
  setQuestionInnerHeight: PropTypes.func.isRequired,
  updateQuestionChange: PropTypes.func.isRequired,
  updateAnswerChange: PropTypes.func.isRequired,
  addImage: PropTypes.func.isRequired,
  setImageURL: PropTypes.func.isRequired,
  updateImageChange: PropTypes.func.isRequired,
  resizeTextEditor: PropTypes.func.isRequired,
  updateTextHeight: PropTypes.func.isRequired,

  setPreviewMode: PropTypes.func.isRequired,
  togglePreviewMode: PropTypes.func.isRequired,
  setPageHeading: PropTypes.func.isRequired,
  setPageTitle: PropTypes.func.isRequired,
  setPageLayout: PropTypes.func.isRequired,
  submitPage: PropTypes.func.isRequired,
  updatePage: PropTypes.func.isRequired,
  loadPage: PropTypes.func.isRequired,

  setEditAccess: PropTypes.func.isRequired,

  viewPagesModal: PropTypes.func.isRequired,
  closePagesModal: PropTypes.func.isRequired,
  viewLoginModal: PropTypes.func.isRequired,
  closeLoginModal: PropTypes.func.isRequired,
  viewSignUpModal: PropTypes.func.isRequired,
  closeSignUpModal: PropTypes.func.isRequired,
  toggleFileDropdown: PropTypes.func.isRequired,
  toggleHelpDropdown: PropTypes.func.isRequired,
  toggleAccountDropdown: PropTypes.func.isRequired,
  isShareModalOpen: PropTypes.bool.isRequired,
  closeShareModal: PropTypes.func.isRequired,
  viewShareModal: PropTypes.func.isRequired,
  closeForgotModal: PropTypes.func.isRequired,
  viewForgotModal: PropTypes.func.isRequired,
  closeResetModal: PropTypes.func.isRequired,
  viewResetModal: PropTypes.func.isRequired,
  closeConfirmUserModal: PropTypes.func.isRequired,
  viewConfirmUserModal: PropTypes.func.isRequired,
  isConfirmUserModalOpen: PropTypes.bool.isRequired,
  isWelcomeModalOpen: PropTypes.bool.isRequired,
  isPreferencesPanelOpen: PropTypes.bool.isRequired,
  viewWelcomeModal: PropTypes.func.isRequired,
  closeWelcomeModal: PropTypes.func.isRequired,
  togglePreferencesPanel: PropTypes.func.isRequired,

  // preferences
  fetchUserPreferences: PropTypes.func.isRequired,
  editorFontSize: PropTypes.number.isRequired,
  editorTheme: PropTypes.string.isRequired,
  editorAutoSave: PropTypes.bool.isRequired,

  logoutUser: PropTypes.func.isRequired,
  updateUserName: PropTypes.func.isRequired,
  updateUserPassword: PropTypes.func.isRequired,
  signUserUp: PropTypes.func.isRequired,
  fetchAllPages: PropTypes.func.isRequired,

  // navigation
  pageHeading: PropTypes.string.isRequired,
  createNavigationContent: PropTypes.func.isRequired,
  openNavigationContent: PropTypes.func.isRequired,
  isNavigationOpen: PropTypes.bool.isRequired
};

function mapStateToProps(state) {
  return {
    editors: state.editorsReducer.editors,
    editorIndex: state.editorsReducer.editorIndex,
    currentWidget: state.editorsReducer.currentWidget,

    workspace: state.workspace.workspace,

    layout: state.page.layout,
    rgl: state.page.rgl,
    pageHeading: state.page.pageHeading,
    pageTitle: state.page.pageTitle,
    id: state.page.id,
    preview: state.page.preview,
    unsavedChanges: state.page.unsavedChanges,
    textHeights: state.page.textHeights,

    canEdit: state.user.canEdit,
    loginName: state.user.loginName,
    loginPassword: state.user.loginPassword,
    name: state.user.name,
    userType: state.user.type,
    requiresGuardianConsent: state.user.requiresGuardianConsent,

    isAccountDropdownOpen: state.mainToolbar.isAccountDropdownOpen,
    isExamplesModalOpen: state.mainToolbar.isExamplesModalOpen,
    isFileDropdownOpen: state.mainToolbar.isFileDropdownOpen,
    isHelpDropdownOpen: state.mainToolbar.isHelpDropdownOpen,
    isPagesModalOpen: state.mainToolbar.isPagesModalOpen,
    isShareModalOpen: state.mainToolbar.isShareModalOpen,
    isWelcomeModalOpen: state.mainToolbar.isWelcomeModalOpen,

    isLoginModalOpen: state.mainToolbar.isLoginModalOpen,
    isSignUpModalOpen: state.mainToolbar.isSignUpModalOpen,
    isForgotModalOpen: state.mainToolbar.isForgotModalOpen,
    isResetModalOpen: state.mainToolbar.isResetModalOpen,
    isConfirmUserModalOpen: state.mainToolbar.isConfirmUserModalOpen,
    isPreferencesPanelOpen: state.mainToolbar.isPreferencesPanelOpen,

    editorFontSize: state.preferences.editorFontSize,
    editorTheme: state.preferences.editorTheme,
    editorAutoSave: state.preferences.editorAutoSave,

    navigationContent: state.navigation.navigationContent,
    isNavigationOpen: state.navigation.isNavigationOpen
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({
    ...editorActions,
    ...mainToolbarActions,
    ...navigationActions,
    ...pageActions,
    ...preferencesActions,
    ...userActions,
    loadWorkspace
  }, dispatch);
}
export default connect(mapStateToProps, mapDispatchToProps)(App);
