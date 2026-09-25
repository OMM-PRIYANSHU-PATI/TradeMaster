import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseStyle = "px-4 py-2 rounded font-medium transition-colors";
  const variantStyle = variant === 'primary' ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700";
  return (
    <button className={\\ \ \\} {...props}>
      {children}
    </button>
  );
};
