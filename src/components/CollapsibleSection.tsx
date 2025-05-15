// src/components/CollapsibleSection.tsx
import React, { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
    title: string;
    children: React.ReactNode;
}

const CollapsibleSection: React.FC<Props> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            style={{
                border: "1px solid #222",
                borderRadius: "12px",
                marginBottom: "24px",
                backgroundColor: "#111",
                padding: "20px",
                boxShadow: "0 0 10px rgba(0,255,255,0.08)"
            }}
        >
            <div
            onClick={() => setIsOpen(!isOpen)}
                style={{
                    backgroundColor: "#110",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    color: "#dfb600",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    userSelect: "none"
                }}
            >
                <span>{title}</span>
                {isOpen ? <FaChevronUp /> : <FaChevronDown />}
            </div>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ overflow: "hidden", marginTop: "16px" }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CollapsibleSection;
