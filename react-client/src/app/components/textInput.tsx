"use client"; // This is a client component 👈🏽

import { ChangeEvent, useState } from "react"

interface TextInputProps {
    placeholder: string
}

export const TextInput = ({placeholder}: TextInputProps) => {

    const [text, setText] = useState('');

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setText(event.target.value);
    }
    
    return (
        <textarea 
            value={text} 
            onChange={handleChange}
            placeholder={placeholder}
            className="textarea"
        />
    )
}
