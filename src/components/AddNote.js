import { useState } from "react";

const AddNote = ({ handleAddNote }) => {
  const [noteText, setNoteText] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const titleCharacterLimit = 20;
  const characterLimit = 200;

  const backgroundColorList = ["#A8D672", "#98B7DB", "#EB7A53", "#F7D44C", "#B5C99A"]

  const handleTitleChange = (event) => {
    if (titleCharacterLimit - event.target.value.length >= 0) {
      setNoteTitle(event.target.value);
    }
  };

  const handleChange = (event) => {
    if (characterLimit - event.target.value.length >= 0) {
      setNoteText(event.target.value);
    }
  };

  const handleSaveClick = () => {
    if (noteText.trim().length > 0 && noteTitle.trim().length > 0) {
      let randomColorPicker = Math.floor(Math.random() * backgroundColorList.length);
      let randomColor = backgroundColorList[randomColorPicker];
      handleAddNote(noteText, noteTitle, randomColor);
      setNoteText("");
      setNoteTitle("");
    }
  };

  return (
    <div className="note new">
      <input type="text" placeholder="T I T L E" onChange={handleTitleChange} value={noteTitle}/>
      <textarea
        rows={8}
        cols={10}
        placeholder="Type to add a note"
        value={noteText}
        onChange={handleChange}
      ></textarea>
      <div className="note-footer">
        <small>{characterLimit - noteText.length} remaining</small>
        <button className="save" onClick={handleSaveClick}>
          Save
        </button>
      </div>
    </div>
  );
};

export default AddNote;
