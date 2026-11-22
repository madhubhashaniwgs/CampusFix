
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X } from 'lucide-react';
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
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Compress the selected image client-side (max 1200px, JPEG)
  // so uploads stay small enough for the JSON API.
  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        setPhoto(dataUrl);
        setPhotoPreview(dataUrl);
        setError('');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

    try {
      setLoading(true);

      await createIssue({ ...formData, photo });

      setFormData(initialFormData);
      removePhoto();
      navigate('/student/my-issues', { replace: true });
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

          <div className="form-group">
            <label>Photo (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              hidden
            />

            {photoPreview ? (
              <div className="photo-preview">
                <img src={photoPreview} alt="Issue preview" />
                <button
                  type="button"
                  className="photo-remove"
                  onClick={removePhoto}
                  aria-label="Remove photo"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="photo-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={18} />
                Add a photo
              </button>
            )}
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
