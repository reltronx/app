import React from 'react';
import PropTypes from 'prop-types';
import SplitPane from 'react-split-pane';

class Questions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isResizing: false
    };
    this.setCurrentEditor = () => { this.props.setCurrentEditor(this.props.id); };
    this.removeEditor = () => { this.props.removeEditor(this.props.id); };
    this.updateAnswerChange = (event) => {
      this.props.updateAnswerChange(this.props.id, event.target.value);
    };
    this.updateQuestionChange = (event) => {
      this.props.updateQuestionChange(this.props.id, event.target.value);
    };
    this.setQuestionInnerHeight = value => this.props.setQuestionInnerHeight(this.props.id, value);
    this.startResize = this.startResize.bind(this);
    this.finishResize = this.finishResize.bind(this);
  }

  startResize() {
    this.setState({ isResizing: true });
  }

  finishResize() {
    this.setState({ isResizing: false });
  }

  render() {
    return (
      <div>
        <section className="question__container">
          <SplitPane
            split="horizontal"
            minSize={this.props.minHeight}
            defaultSize={this.props.innerHeight}
            onDragStarted={this.startResize}
            onDragFinished={(size) => {
              this.finishResize();
              this.setQuestionInnerHeight(size);
            }}
          >
            <textarea
              className="question__question"
              onChange={this.updateQuestionChange}
              readOnly={this.props.preview}
              value={this.props.question}
            >
            </textarea>
            <textarea
              className="question__answer"
              onChange={this.updateAnswerChange}
              value={this.props.answer}
            >
            </textarea>
          </SplitPane>
        </section>
      </div>
    );
  }
}

Questions.propTypes = {
  id: PropTypes.string.isRequired,
  answer: PropTypes.string.isRequired,
  innerHeight: PropTypes.number.isRequired,
  minHeight: PropTypes.number.isRequired,
  preview: PropTypes.bool.isRequired,
  question: PropTypes.string.isRequired,
  removeEditor: PropTypes.func.isRequired,
  setCurrentEditor: PropTypes.func.isRequired,
  setQuestionInnerHeight: PropTypes.func.isRequired,
  updateAnswerChange: PropTypes.func.isRequired,
  updateQuestionChange: PropTypes.func.isRequired
};

export default Questions;