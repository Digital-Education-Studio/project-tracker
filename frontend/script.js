// Vue app for project tracker

const { createApp, nextTick } = Vue;

createApp({
  data() {
    return {
      programmes: [],
      selectedProgrammeId: null,
      selectedProgramme: null,
      currentModule: null,
      newModuleName: '',
      taskForms: {},
      gantt: null,
    };
  },
  methods: {
    async fetchProgrammes() {
      try {
        const res = await fetch('/api/programmes');
        const data = await res.json();
        this.programmes = data;
      } catch (err) {
        console.error(err);
        alert('Failed to fetch programmes');
      }
    },
    async onProgrammeChange() {
      this.selectedProgramme = null;
      this.currentModule = null;
      if (!this.selectedProgrammeId) return;
      try {
        const res = await fetch(`/api/programmes/${this.selectedProgrammeId}`);
        if (!res.ok) throw new Error('Failed to fetch programme');
        const programme = await res.json();
        this.selectedProgramme = programme;
        // Initialize task form for each module
        this.taskForms = {};
        for (const module of programme.modules) {
          this.taskForms[module.id] = { name: '', start: '', end: '' };
        }
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    },
    async addModule() {
      if (!this.newModuleName.trim()) return;
      try {
        const res = await fetch(`/api/programmes/${this.selectedProgrammeId}/modules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.newModuleName.trim() }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to add module');
        }
        this.newModuleName = '';
        this.onProgrammeChange();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    },
    async addTask(module) {
      const form = this.taskForms[module.id];
      if (!form.name || !form.start || !form.end) {
        alert('Please fill task name and dates');
        return;
      }
      try {
        const res = await fetch(`/api/modules/${module.id}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, start: form.start, end: form.end }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to add task');
        }
        // Clear form and refresh programme details
        this.taskForms[module.id] = { name: '', start: '', end: '' };
        await this.onProgrammeChange();
        // If we are viewing this module currently, refresh view
        if (this.currentModule && this.currentModule.id === module.id) {
          // update currentModule with new tasks
          const updated = this.selectedProgramme.modules.find((m) => m.id === module.id);
          this.currentModule = JSON.parse(JSON.stringify(updated));
          await nextTick();
          this.renderGantt();
        }
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    },
    showModule(module) {
      this.currentModule = JSON.parse(JSON.stringify(module));
      // Defer rendering until DOM update
      nextTick(() => {
        this.renderGantt();
      });
    },
    renderGantt() {
      if (!this.currentModule) return;
      const tasks = this.currentModule.tasks.map((t) => {
        return {
          id: `${this.currentModule.id}-${t.id}`,
          name: t.name,
          start: t.start,
          end: t.end,
          progress: 0,
          dependencies: '',
        };
      });
      // Destroy previous gantt instance if exists
      if (this.gantt) {
        document.getElementById('gantt').innerHTML = '';
      }
      this.gantt = new Gantt('#gantt', tasks, {
        view_mode: 'Month',
        language: 'en',
      });
    },
    downloadChart() {
      const ganttEl = document.getElementById('gantt');
      html2canvas(ganttEl).then((canvas) => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${this.currentModule.name}-gantt.png`;
        link.click();
      });
    },
  },
  mounted() {
    this.fetchProgrammes();
  },
}).mount('#app');
