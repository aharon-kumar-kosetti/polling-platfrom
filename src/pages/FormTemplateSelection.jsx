import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionAPI } from '../api/client'; // Will need to add formAPI to client.js, but let's do fetch direct for now

const FormTemplateSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // Assume fetchClient is available or we use native fetch
        const res = await fetch('http://localhost:3000/api/forms', {credentials: 'include'});
        const data = await res.json();
        if (data.success) {
          // Filter to only show templates
          setTemplates(data.forms.filter(f => f.status === 'template'));
        }
      } catch (err) {
        console.error("Failed to fetch templates", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleCreateFromScratch = () => {
    navigate('/builder/form');
  };

  const handleUseTemplate = async (template) => {
    try {
      // Create a new draft form using the template's data
      const payload = {
        title: `${template.title} (Copy)`,
        description: template.description,
        instructions: template.instructions,
        status: 'draft',
        questions: template.questions.map(q => ({
          type: q.type,
          text: q.text,
          options: q.options ? JSON.parse(q.options) : null,
          correctAnswer: q.correctAnswer ? JSON.parse(q.correctAnswer) : null,
          marks: q.marks,
          isRequired: q.isRequired
        }))
      };

      const res = await fetch('http://localhost:3000/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/builder/form?id=${data.form.id}`);
      }
    } catch (err) {
      console.error("Failed to use template", err);
      alert("Error creating form from template.");
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased relative selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Header */}
      <header className="p-4 bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-2 rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[24px]">assignment</span>
            <span className="font-display-sm text-xl font-bold">New Form</span>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full px-6 py-8 md:px-12 md:py-10 max-w-[1200px] mx-auto">
        <div className="mb-10 text-center">
          <h1 className="font-display-lg text-3xl md:text-5xl text-primary tracking-tight mb-4">
            How would you like to start?
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Create a form from scratch or choose an existing template to get started quickly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
          {/* Create from Scratch Card */}
          <button 
            onClick={handleCreateFromScratch}
            className="group relative bg-surface-container-lowest rounded-3xl p-10 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center min-h-[300px] hover:-translate-y-2 transition-all duration-300 overflow-hidden text-center hover:shadow-lg hover:border-primary/40"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-br-full -ml-8 -mt-8 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="relative z-10 w-20 h-20 rounded-3xl bg-primary text-on-primary flex items-center justify-center shadow-md mb-6">
              <span className="material-symbols-outlined text-4xl">add</span>
            </div>
            <div className="relative z-10">
              <h3 className="font-headline-lg text-2xl font-bold text-primary mb-2">Create from Scratch</h3>
              <p className="font-body-md text-on-surface-variant">Build a brand new blank form with your custom questions and fields.</p>
            </div>
          </button>

          {/* Use Template Info Card */}
          <div className="group relative bg-surface-container-lowest rounded-3xl p-10 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center min-h-[300px] overflow-hidden text-center">
             <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary/10 rounded-tl-full -mr-8 -mb-8 transition-transform duration-500"></div>
             <div className="relative z-10 w-20 h-20 rounded-3xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-sm mb-6 border border-secondary/20">
               <span className="material-symbols-outlined text-4xl">file_copy</span>
             </div>
             <div className="relative z-10">
               <h3 className="font-headline-lg text-2xl font-bold text-primary mb-2">Use a Template</h3>
               <p className="font-body-md text-on-surface-variant">Select from your saved templates below. It creates a copy you can safely edit.</p>
             </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6 pb-2 border-b border-outline-variant/30">
            <span className="material-symbols-outlined text-secondary">library_books</span>
            <h2 className="font-display-sm text-2xl font-bold text-primary">Your Templates</h2>
          </div>

          {loading ? (
            <div className="py-12 text-center text-on-surface-variant">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
             <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-dashed border-outline-variant/60">
                <span className="material-symbols-outlined text-4xl text-outline mb-3">inventory_2</span>
                <p className="font-body-md text-on-surface-variant">You don't have any templates saved yet.<br/>Create a form and use the "Save as Template" option to see it here.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map(tpl => (
                <div key={tpl.id} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 flex flex-col hover:border-secondary/40 transition-colors shadow-sm group">
                  <h4 className="font-label-md text-lg font-bold text-primary mb-2 truncate" title={tpl.title}>{tpl.title}</h4>
                  <p className="font-body-sm text-on-surface-variant line-clamp-2 mb-4 flex-grow">
                    {tpl.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/20">
                    <span className="text-xs text-on-surface-variant font-medium bg-surface-container px-2 py-1 rounded-md">
                      {tpl.questions?.length || 0} Questions
                    </span>
                    <button 
                      onClick={() => handleUseTemplate(tpl)}
                      className="text-sm font-label-md bg-secondary text-on-secondary px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1"
                    >
                      Use
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FormTemplateSelection;
