"use client"; // This is a client component 👈🏽

import { MouseEvent, useState } from "react";

interface ButtonProps {
    title: string;
}

export const Button = ({title}: ButtonProps) => {

    const [isClicked, setIsClicked] = useState(false);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        console.log(`${title} clicked.`, event.target)
        setIsClicked(true);
    }
    
    return (
        <button 
            disabled={isClicked} 
            className="btn btn-primary"
            onClick={handleClick}
        >
            {title}
        </button>
    );
}
