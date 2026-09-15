"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./entry.module.css";

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.passwordWrap}>
      <input {...props} type={visible ? "text" : "password"} className={styles.input} />
      <button type="button" className={styles.passwordToggle} onClick={() => setVisible((value) => !value)} aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={visible}>
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}
