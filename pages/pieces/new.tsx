import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Router from 'next/router';
import { getSession } from 'next-auth/react';

const NewPiece: React.FC = () => {
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [scoreUrl, setScoreUrl] = useState('');
  const [scoreFormat, setScoreFormat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submitData = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const session = await getSession();
      if (scoreFormat === 'mei') {
        //upload to Blob
        
      } else {
        if (scoreFormat === 'krn') { 
          //convert krn to mei

        } else if (scoreFormat === 'musicxml') {
          //convert musicxml to mei

        } else if (scoreFormat === 'musedata') {
          // convert musedata to mei

        } else {
          throw new Error('Invalid score format');
        }
      }

      //upload to Blob

      const body = { title, composer, scoreUrl, scoreFormat, email: session.user.email };
      const res = await fetch('/api/pieces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create piece');
      Router.push('/pieces');
    } catch (err) {
      setError('Failed to create piece');
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div>
        <h1>Submit New Piece</h1>
        <form onSubmit={submitData}>
          <input
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            type="text"
            value={title}
          />
          <input
            onChange={e => setComposer(e.target.value)}
            placeholder="Composer"
            type="text"
            value={composer}
          />
          <input
            onChange={e => setScoreUrl(e.target.value)}
            placeholder="Score URL"
            type="text"
            value={scoreUrl}
          />
                    <input
            onChange={e => setScoreFormat(e.target.value)}
            placeholder="Score Format"
            type="text"
            value={scoreFormat}
          />
          
          
          <input disabled={saving || !title || !composer || !scoreUrl || !scoreFormat} type="submit" value="Submit" />
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
      <style jsx>{`
        input[type='text'] {
          width: 100%;
          padding: 0.5rem;
          margin: 0.5rem 0;
          border-radius: 0.25rem;
          border: 0.125rem solid rgba(0, 0, 0, 0.2);
        }
        input[type='submit'] {
          background: #ececec;
          border: 0;
          padding: 1rem 2rem;
        }
      `}</style>
    </Layout>
  );
};

export default NewPiece; 