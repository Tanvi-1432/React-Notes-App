import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import NotesList from "./components/NotesList";
import Search from "./components/Search";
import Header from "./components/Header";

function App() {
    const [notes, setNotes] = useState([]);

    const [searchText, setSearchText] = useState('');

    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const savedNotes = JSON.parse(localStorage.getItem('notes-app-data'));
        if (savedNotes) {
            setNotes(savedNotes);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('notes-app-data', JSON.stringify(notes));
    }, [notes]);

    useEffect(() => {
        const savedDarkMode = JSON.parse(localStorage.getItem('toggle-dark-mode-data'));
        if (savedDarkMode) {
            setDarkMode(savedDarkMode);
        }
    },[]);

    useEffect(() => {
        localStorage.setItem('toggle-dark-mode-data', JSON.stringify(darkMode));
    }, [darkMode]);

    const addNote = (text, title, randomColor) => {
        const date = new Date();
        const newNote = {
            id: nanoid(),
            title: title,
            text: text,
            date: date.toLocaleDateString(),
            randomBackgroundColor: randomColor
        }
        const newNotes = [newNote, ...notes];
        setNotes(newNotes)
    }

    const deleteNote = (id) => {
        const newNotes = notes.filter(note => note.id !== id);
        setNotes(newNotes);
    }

    return (
        <div className={darkMode ? 'dark-mode' : null}>
            <div className="container">
                <Header handleToggleDarkMode={setDarkMode} darkMode={darkMode}/>
                <Search handleSearchNote={setSearchText} />
                <NotesList
                    notes={notes.filter((note) => note.title.toLowerCase().includes(searchText))}
                    handleAddNote={addNote}
                    handleDeleteNote={deleteNote}
                />
            </div>
        </div>
    )
}

export default App;
