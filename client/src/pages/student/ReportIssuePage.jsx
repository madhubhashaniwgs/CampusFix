
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../../services/issueService';
import './ReportIssuePage.css';

const initialFormData = {
  title: '',
  description: '',
  category: 'other',
  location: '',
  priority: 'medium',
};

function ReportIssuePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    try {
      setLoading(true);

      const response = await createIssue(formData);

      setSuccess(
        `${response.message} Ticket ID: ${response.data.ticketId}`
      );

      setFormData(initialFormData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to submit your issue. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-page">
      <div className="report-container">
        <div className="report-heading">
          <span className="report-eyebrow">STUDENT PORTAL</span>
          <h1>Report a Campus Issue</h1>
          <p>
            Found something that needs attention? Submit the details
            below and our campus team will look into it.
          </p>
        </div>

        <form className="report-form" onSubmit={handleSubmit}>
          {error && (
            <div className="report-alert report-error">
              {error}
            </div>
          )}

          {success && (
            <div className="report-alert report-success">
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Issue Title</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Broken classroom light"
              value={formData.title}
              onChange={handleChange}
              maxLength={120}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe the issue and any useful details..."
              value={formData.description}
              onChange={handleChange}
              maxLength={2000}
              rows={5}
              required
            />
            <span className="field-hint">
              {formData.description.length}/2000 characters
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="it">IT / Network</option>
                <option value="furniture">Furniture</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Campus Location</label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="e.g. FIT Building - Lecture Hall 02"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>

          <div className="report-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate('/student/dashboard')}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReportIssuePage;
