'use client';

import React, { useState } from 'react';
import { Connection, INDUSTRIES } from '@/types';
import { useConnections } from '@/context/ConnectionsContext';
import styles from './AddConnection.module.css';

interface FormData {
    name: string;
    title: string;
    company: string;
    industry: string;
    email: string;
    phone: string;
    linkedIn: string;
}

const initialFormData: FormData = {
    name: '',
    title: '',
    company: '',
    industry: 'Technology',
    email: '',
    phone: '',
    linkedIn: '',
};

export default function AddConnection() {
    const { addConnections } = useConnections();
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) return;

        const newConnection: Connection = {
            id: `manual-${Date.now()}`,
            name: formData.name.trim(),
            title: formData.title.trim() || 'Unknown',
            company: formData.company.trim() || 'Unknown',
            industry: formData.industry,
            email: formData.email.trim() || undefined,
            phone: formData.phone.trim() || undefined,
            linkedIn: formData.linkedIn.trim() || undefined,
            lastContactDate: new Date(),
            degree: 1,
        };

        addConnections([newConnection]);
        setFormData(initialFormData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className={styles.addButton}>
                <span>➕</span> Add Connection
            </button>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span>Add Connection</span>
                <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                    <label>Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Joe Smith"
                        required
                    />
                </div>

                <div className={styles.field}>
                    <label>Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Software Engineer"
                    />
                </div>

                <div className={styles.field}>
                    <label>Company</label>
                    <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Acme Corp"
                    />
                </div>

                <div className={styles.field}>
                    <label>Industry</label>
                    <select name="industry" value={formData.industry} onChange={handleChange}>
                        {INDUSTRIES.map(ind => (
                            <option key={ind} value={ind}>{ind}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.field}>
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="joe@example.com"
                    />
                </div>

                <div className={styles.field}>
                    <label>Phone</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 123-4567"
                    />
                </div>

                <div className={styles.field}>
                    <label>LinkedIn</label>
                    <input
                        type="text"
                        name="linkedIn"
                        value={formData.linkedIn}
                        onChange={handleChange}
                        placeholder="linkedin.com/in/joesmith"
                    />
                </div>

                <button type="submit" className={styles.submitBtn}>
                    Add to Network
                </button>

                {success && (
                    <div className={styles.success}>✓ Connection added!</div>
                )}
            </form>
        </div>
    );
}
