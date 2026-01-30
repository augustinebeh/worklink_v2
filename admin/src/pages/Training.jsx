import { useState, useEffect } from 'react';
import {
  BookOpenIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ClockIcon,
  ZapIcon,
  AwardIcon,
  UsersIcon,
  SearchIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { clsx } from 'clsx';

function TrainingCard({ training, onEdit, onDelete }) {
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <BookOpenIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{training.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{training.description}</p>
            
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <ClockIcon className="h-4 w-4" />
                <span>{training.duration_minutes} min</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-primary-600">
                <ZapIcon className="h-4 w-4" />
                <span>+{training.xp_reward} XP</span>
              </div>
              {training.certification_name && (
                <div className="flex items-center gap-1 text-sm text-gold-600">
                  <AwardIcon className="h-4 w-4" />
                  <span>{training.certification_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(training)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(training.id)}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function TrainingModal({ isOpen, onClose, training, onSave }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    xp_reward: 100,
    certification_name: '',
  });

  useEffect(() => {
    if (training) {
      setForm(training);
    } else {
      setForm({
        title: '',
        description: '',
        duration_minutes: 30,
        xp_reward: 100,
        certification_name: '',
      });
    }
  }, [training]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={training ? 'Edit Training' : 'New Training'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Duration (minutes)"
            type="number"
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
            min={5}
          />
          <Input
            label="XP Reward"
            type="number"
            value={form.xp_reward}
            onChange={(e) => setForm({ ...form, xp_reward: parseInt(e.target.value) })}
            min={0}
          />
        </div>

        <Input
          label="Certification Name (optional)"
          value={form.certification_name}
          onChange={(e) => setForm({ ...form, certification_name: e.target.value })}
          placeholder="e.g., Food Safety Certificate"
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{training ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Training() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const res = await fetch('/api/v1/training');
      const data = await res.json();
      if (data.success) setTrainings(data.data);
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      const method = editingTraining ? 'PUT' : 'POST';
      const url = editingTraining 
        ? `/api/v1/training/${editingTraining.id}` 
        : '/api/v1/training';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      fetchTrainings();
      setShowModal(false);
      setEditingTraining(null);
    } catch (error) {
      console.error('Failed to save training:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this training?')) return;
    
    try {
      await fetch(`/api/v1/training/${id}`, { method: 'DELETE' });
      fetchTrainings();
    } catch (error) {
      console.error('Failed to delete training:', error);
    }
  };

  const handleEdit = (training) => {
    setEditingTraining(training);
    setShowModal(true);
  };

  const filteredTrainings = trainings.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training Modules</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage training courses and certifications for workers
          </p>
        </div>
        <Button icon={PlusIcon} onClick={() => { setEditingTraining(null); setShowModal(true); }}>
          Add Training
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <BookOpenIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{trainings.length}</p>
              <p className="text-sm text-slate-500">Total Courses</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gold-100 dark:bg-gold-900/30">
              <AwardIcon className="h-6 w-6 text-gold-600 dark:text-gold-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {trainings.filter(t => t.certification_name).length}
              </p>
              <p className="text-sm text-slate-500">Certifications</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <UsersIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">156</p>
              <p className="text-sm text-slate-500">Completions This Month</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Input
        icon={SearchIcon}
        placeholder="Search trainings..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Training List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredTrainings.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <BookOpenIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No trainings found</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTrainings.map(training => (
            <TrainingCard
              key={training.id}
              training={training}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <TrainingModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTraining(null); }}
        training={editingTraining}
        onSave={handleSave}
      />
    </div>
  );
}
