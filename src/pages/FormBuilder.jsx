import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const FormBuilder = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [feedback, setFeedback] = useState('');
  const [file, setFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setName('');
    setBranch('');
    setDifficulty('');
    setFeedback('');
    handleRemoveFile();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased">
      {/* Top Bar - Kept navigation unchanged */}
      <header className="p-4 bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-30 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors flex items-center p-2 rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">assignment</span>
            <span className="font-display-sm text-lg font-bold">Create from scratch</span>
          </div>
        </div>
      </header>

      <main className="flex-grow flex justify-center p-6 pb-32">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          
          {!submitted ? (
            <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/30 shadow-editorial">
              <div className="mb-8">
                <h1 className="font-display-sm text-3xl font-bold text-primary mb-2">
                  Student Feedback Form
                </h1>
                <p className="text-sm text-on-surface-variant">
                  Please fill out the form below to share your experience.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                
                {/* 1. Name of the Student */}
                <div>
                  <label className="block text-sm font-label-md text-on-surface font-bold mb-2">
                    1. Name of the Student <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl p-3.5 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* 2. Branch */}
                <div>
                  <label className="block text-sm font-label-md text-on-surface font-bold mb-2">
                    2. Branch
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl p-3.5 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select your branch</option>
                    <option value="CSD">CSD</option>
                    <option value="CSIT">CSIT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* 3. Difficulty Level */}
                <div>
                  <label className="block text-sm font-label-md text-on-surface font-bold mb-3">
                    3. How was the difficulty level of the quiz questions?
                  </label>
                  <div className="flex flex-col gap-3">
                    {['Very Easy', 'Easy', 'Moderate', 'Difficult', 'Very Difficult'].map((level) => (
                      <label key={level} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="difficulty"
                          value={level}
                          checked={difficulty === level}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="w-5 h-5 accent-primary border-outline-variant bg-surface-container cursor-pointer"
                        />
                        <span className="font-body-md text-sm text-on-surface group-hover:text-primary transition-colors">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Feedback in Your Own Words */}
                <div>
                  <label className="block text-sm font-label-md text-on-surface font-bold mb-2">
                    4. Your Feedback in Your Own Words
                  </label>
                  <textarea
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Share your experience and suggestions..."
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl p-3.5 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                {/* 5. Add File */}
                <div>
                  <label className="block text-sm font-label-md text-on-surface font-bold mb-2">
                    5. Add File
                  </label>
                  <div className="border-2 border-dashed border-outline-variant/60 rounded-xl p-6 flex flex-col items-center justify-center bg-surface-container-lowest">
                    {!file ? (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <span className="material-symbols-outlined text-3xl text-outline-variant mb-1">upload_file</span>
                        <p className="text-xs text-on-surface-variant max-w-[200px]">Supported formats: PDF, DOC/DOCX, PNG, JPG/JPEG</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 px-5 py-2 bg-secondary-container text-on-secondary-container rounded-full font-label-md text-sm hover:bg-secondary/20 transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                          Upload File
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="flex items-center gap-3 bg-surface-container p-3 rounded-lg w-full max-w-sm">
                          <span className="material-symbols-outlined text-primary">description</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-label-md text-sm text-on-surface truncate">{file.name}</p>
                            <p className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="mt-2 px-4 py-1.5 border border-error text-error rounded-full font-label-md text-xs hover:bg-error-container transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Remove File
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-outline-variant/30 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-6 py-2.5 rounded-full border border-outline-variant/50 text-on-surface font-label-md text-sm hover:bg-surface-container transition-colors"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Submit Feedback
                  </button>
                </div>

              </form>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-3xl p-10 border border-outline-variant/30 shadow-editorial text-center mt-10">
              <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <h2 className="font-display-sm text-3xl font-bold text-primary mb-3">Thank you for your feedback!</h2>
              <p className="text-base text-on-surface-variant mb-8 max-w-sm mx-auto">
                Your submission has been recorded successfully.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-8 py-3 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all"
              >
                Submit Another Response
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default FormBuilder;
