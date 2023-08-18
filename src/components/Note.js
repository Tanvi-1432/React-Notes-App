import { MdDeleteForever } from 'react-icons/md';

const Note = ({ id, title, text, date, randomBackgroundColor, handleDeleteNote }) => {
    return (
        <div className="note" style={{ backgroundColor: `${randomBackgroundColor}` }}>
            <div className='note-text'>
                <h2>{title}</h2>
                <span>{text}</span>
            </div>
            <div className="note-footer">
                <small>{date}</small>
                <MdDeleteForever className='delete-icon' size="1.3em" onClick={() => handleDeleteNote(id)} />
            </div>
        </div>
    )
}

export default Note;