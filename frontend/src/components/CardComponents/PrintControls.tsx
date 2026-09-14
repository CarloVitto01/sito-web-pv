import React from "react";
import "./PrintControls.css";

const controlIcons = {
    file: (
        <>
            <path d="M7 3h7l4 4v14H7z" />
            <path d="M14 3v5h4M10 12h5M10 16h5" />
        </>
    ),
    link: (
        <>
            <path d="m10 13 4-4" />
            <path d="m9 15-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0" />
            <path d="m13 9 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" />
        </>
    ),
    pages: (
        <>
            <rect x="8" y="3" width="12" height="15" rx="2" />
            <path d="M16 21H5a2 2 0 0 1-2-2V8" />
        </>
    ),
};

export function ControlIcon({
    kind = "file",
}: {
    kind?: keyof typeof controlIcons;
}) {
    return (
        <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {controlIcons[kind]}
        </svg>
    );
}

type ControlFrameProps = {
    title?: string;
    hint?: string;
    bare?: boolean;
    hideTitle?: boolean;
    children: React.ReactNode;
};

export function ControlFrame({
    title,
    hint,
    bare = false,
    hideTitle = false,
    children,
}: ControlFrameProps) {
    return (
        <div
            className={`pc-control ${bare ? "pc-control--bare" : "pc-control--panel"
                }`}
        >
            {!bare && !hideTitle && title && (
                <div className="pc-heading">
                    <h3>{title}</h3>
                    {hint && <p>{hint}</p>}
                </div>
            )}

            {children}
        </div>
    );
}

export function CheckMark() {
    return (
        <span className="pc-check" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path
                    d="m3 8 3 3 7-7"
                    stroke="currentColor"
                    strokeWidth="2"
                />
            </svg>
        </span>
    );
}