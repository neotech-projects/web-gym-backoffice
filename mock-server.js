/**
 * Mock Server per simulare il microservizio della dashboard
 * Avvia un server Express sulla porta 3000 che restituisce dati JSON
 * 
 * Per avviare: node mock-server.js
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Assicurati che tutte le risposte API siano JSON
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Simula dati dinamici per le presenze attuali (varia tra 0 e 5)
function getRandomCurrentPresences() {
  return Math.floor(Math.random() * 6);
}

// Endpoint principale per le statistiche della dashboard
app.get('/api/dashboard/stats', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/dashboard/stats`);
  
  const response = {
    success: true,
    data: {
      weeklyBookings: 15,
      monthlyPresences: 28,
      currentPresences: getRandomCurrentPresences(),
      lastUpdate: new Date().toISOString()
    },
    message: 'Dati recuperati con successo'
  };
  
  // Simula un leggero delay di rete
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per le presenze attuali (usato per aggiornamenti periodici)
app.get('/api/dashboard/stats/current-presences', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/dashboard/stats/current-presences`);
  
  const response = {
    success: true,
    currentPresences: getRandomCurrentPresences()
  };
  
  setTimeout(() => {
    res.json(response);
  }, 50);
});

// Endpoint per la lista delle presenze attuali con i nominativi
app.get('/api/dashboard/stats/current-presences-list', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/dashboard/stats/current-presences-list`);
  
  try {
    // Carica gli utenti dal file JSON
    const usersPath = path.join(__dirname, 'src', 'assets', 'mock', 'users.json');
    const usersData = fs.readFileSync(usersPath, 'utf8');
    const users = JSON.parse(usersData);
    
    // Genera un numero casuale di presenze (0-5)
    const count = getRandomCurrentPresences();
    
    // Mescola gli utenti e prendi i primi 'count'
    const shuffled = [...users].sort(() => 0.5 - Math.random());
    const presences = shuffled.slice(0, count).map(user => {
      // Genera dati casuali per la prenotazione
      const startHour = Math.floor(Math.random() * 8) + 9; // 9-16
      const startMinute = Math.random() > 0.5 ? 0 : 30;
      const duration = Math.random() > 0.5 ? 60 : 90; // 1h o 1h30
      const endHour = startHour + Math.floor(duration / 60);
      const endMinute = startMinute + (duration % 60);
      
      const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      const durationStr = duration === 60 ? '1h' : '1h 30m';
      
      // Note casuali
      const notes = [
        'Allenamento cardio',
        'Sessione di forza',
        'Allenamento completo',
        'Cardio e stretching',
        'Sessione personalizzata'
      ];
      const note = notes[Math.floor(Math.random() * notes.length)];
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        company: user.company || 'N/A',
        bookingNote: note,
        bookingStartTime: startTime,
        bookingEndTime: endTime,
        bookingDuration: durationStr
      };
    });
    
    const response = {
      success: true,
      currentPresences: count,
      presences: presences
    };
    
    setTimeout(() => {
      res.json(response);
    }, 50);
  } catch (error) {
    console.error('Errore nel caricamento delle presenze:', error);
    // Fallback a dati di default
    const response = {
      success: true,
      currentPresences: 3,
      presences: [
        { 
          id: 1, 
          firstName: 'Mario', 
          lastName: 'Rossi', 
          fullName: 'Mario Rossi',
          company: 'Acme Corporation',
          bookingNote: 'Allenamento cardio',
          bookingStartTime: '10:00',
          bookingEndTime: '11:00',
          bookingDuration: '1h'
        },
        { 
          id: 2, 
          firstName: 'Laura', 
          lastName: 'Bianchi', 
          fullName: 'Laura Bianchi',
          company: 'TechSolutions S.r.l.',
          bookingNote: 'Sessione di forza',
          bookingStartTime: '14:00',
          bookingEndTime: '15:30',
          bookingDuration: '1h 30m'
        },
        { 
          id: 3, 
          firstName: 'Giovanni', 
          lastName: 'Verdi', 
          fullName: 'Giovanni Verdi',
          company: 'Global Industries',
          bookingNote: 'Allenamento completo',
          bookingStartTime: '09:00',
          bookingEndTime: '10:00',
          bookingDuration: '1h'
        }
      ]
    };
    
    setTimeout(() => {
      res.json(response);
    }, 50);
  }
});

// Funzione helper per formattare le date
function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

// Genera dati delle prenotazioni dinamicamente basati sulla data corrente
function generateBookingsData() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const day2 = new Date(today);
  day2.setDate(today.getDate() + 2);
  const day3 = new Date(today);
  day3.setDate(today.getDate() + 3);

  const bookings = [
    {
      id: '1',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T10:00:00`,
      end: `${formatDateISO(tomorrow)}T11:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Cyclette, Tapis Roulant',
        machines: [{ value: 'cyclette', label: 'Cyclette' }, { value: 'tapis', label: 'Tapis Roulant' }],
        user: 'Mario Rossi'
      }
    },
    {
      id: '2',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T10:00:00`,
      end: `${formatDateISO(tomorrow)}T11:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Ellittica',
        machines: [{ value: 'ellittica', label: 'Ellittica' }],
        user: 'Laura Bianchi'
      }
    },
    {
      id: '3',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T10:00:00`,
      end: `${formatDateISO(tomorrow)}T11:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Vogatore, Step',
        machines: [{ value: 'vogatore', label: 'Vogatore' }, { value: 'step', label: 'Step' }],
        user: 'Giovanni Verdi'
      }
    },
    {
      id: '4',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T14:00:00`,
      end: `${formatDateISO(tomorrow)}T15:30:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Panca Multifunzione, Cyclette',
        machines: [{ value: 'panca', label: 'Panca Multifunzione' }, { value: 'cyclette', label: 'Cyclette' }],
        user: 'Anna Ferrari'
      }
    },
    {
      id: '5',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T14:00:00`,
      end: `${formatDateISO(tomorrow)}T15:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Tapis Roulant',
        machines: [{ value: 'tapis', label: 'Tapis Roulant' }],
        user: 'Paolo Neri'
      }
    },
    {
      id: '6',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T18:00:00`,
      end: `${formatDateISO(tomorrow)}T19:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Cyclette',
        machines: [{ value: 'cyclette', label: 'Cyclette' }],
        user: 'Sara Romano'
      }
    },
    {
      id: '7',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T18:00:00`,
      end: `${formatDateISO(tomorrow)}T19:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Tapis Roulant, Ellittica',
        machines: [{ value: 'tapis', label: 'Tapis Roulant' }, { value: 'ellittica', label: 'Ellittica' }],
        user: 'Marco Esposito'
      }
    },
    {
      id: '8',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T18:00:00`,
      end: `${formatDateISO(tomorrow)}T19:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Vogatore',
        machines: [{ value: 'vogatore', label: 'Vogatore' }],
        user: 'Giulia Colombo'
      }
    },
    {
      id: '9',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T18:00:00`,
      end: `${formatDateISO(tomorrow)}T19:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Step, Panca Multifunzione',
        machines: [{ value: 'step', label: 'Step' }, { value: 'panca', label: 'Panca Multifunzione' }],
        user: 'Andrea Ferrari'
      }
    },
    {
      id: '10',
      title: 'Prenotazione',
      start: `${formatDateISO(tomorrow)}T18:00:00`,
      end: `${formatDateISO(tomorrow)}T19:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Cyclette, Tapis Roulant, Ellittica',
        machines: [{ value: 'cyclette', label: 'Cyclette' }, { value: 'tapis', label: 'Tapis Roulant' }, { value: 'ellittica', label: 'Ellittica' }],
        user: 'Elena Ricci'
      }
    },
    {
      id: '11',
      title: 'Prenotazione',
      start: `${formatDateISO(day2)}T09:00:00`,
      end: `${formatDateISO(day2)}T10:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Panca Multifunzione',
        machines: [{ value: 'panca', label: 'Panca Multifunzione' }],
        user: 'Maria Russo'
      }
    },
    {
      id: '12',
      title: 'Prenotazione',
      start: `${formatDateISO(day2)}T16:00:00`,
      end: `${formatDateISO(day2)}T17:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Cyclette',
        machines: [{ value: 'cyclette', label: 'Cyclette' }],
        user: 'Roberto Marino'
      }
    },
    {
      id: '13',
      title: 'Prenotazione',
      start: `${formatDateISO(day2)}T16:00:00`,
      end: `${formatDateISO(day2)}T17:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Tapis Roulant',
        machines: [{ value: 'tapis', label: 'Tapis Roulant' }],
        user: 'Francesca Galli'
      }
    },
    {
      id: '14',
      title: 'Prenotazione',
      start: `${formatDateISO(day2)}T16:00:00`,
      end: `${formatDateISO(day2)}T17:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Ellittica, Vogatore',
        machines: [{ value: 'ellittica', label: 'Ellittica' }, { value: 'vogatore', label: 'Vogatore' }],
        user: 'Giuseppe Conti'
      }
    },
    {
      id: '15',
      title: 'Prenotazione',
      start: `${formatDateISO(day2)}T16:00:00`,
      end: `${formatDateISO(day2)}T17:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Step',
        machines: [{ value: 'step', label: 'Step' }],
        user: 'Chiara Bruno'
      }
    },
    {
      id: '16',
      title: 'Prenotazione',
      start: `${formatDateISO(day3)}T11:00:00`,
      end: `${formatDateISO(day3)}T12:00:00`,
      backgroundColor: '#405189',
      borderColor: '#405189',
      extendedProps: {
        machinesFull: 'Cyclette, Tapis Roulant, Panca Multifunzione',
        machines: [{ value: 'cyclette', label: 'Cyclette' }, { value: 'tapis', label: 'Tapis Roulant' }, { value: 'panca', label: 'Panca Multifunzione' }],
        user: 'Luca Fontana'
      }
    }
  ];

  const allBookings = [
    { id: '1', user: 'Mario Rossi', start: `${formatDateISO(tomorrow)}T10:00:00`, end: `${formatDateISO(tomorrow)}T11:00:00` },
    { id: '2', user: 'Laura Bianchi', start: `${formatDateISO(tomorrow)}T10:00:00`, end: `${formatDateISO(tomorrow)}T11:00:00` },
    { id: '3', user: 'Giovanni Verdi', start: `${formatDateISO(tomorrow)}T10:00:00`, end: `${formatDateISO(tomorrow)}T11:00:00` },
    { id: '4', user: 'Anna Ferrari', start: `${formatDateISO(tomorrow)}T14:00:00`, end: `${formatDateISO(tomorrow)}T15:30:00` },
    { id: '5', user: 'Paolo Neri', start: `${formatDateISO(tomorrow)}T14:00:00`, end: `${formatDateISO(tomorrow)}T15:00:00` },
    { id: '6', user: 'Sara Romano', start: `${formatDateISO(tomorrow)}T18:00:00`, end: `${formatDateISO(tomorrow)}T19:00:00` },
    { id: '7', user: 'Marco Esposito', start: `${formatDateISO(tomorrow)}T18:00:00`, end: `${formatDateISO(tomorrow)}T19:00:00` },
    { id: '8', user: 'Giulia Colombo', start: `${formatDateISO(tomorrow)}T18:00:00`, end: `${formatDateISO(tomorrow)}T19:00:00` },
    { id: '9', user: 'Andrea Ferrari', start: `${formatDateISO(tomorrow)}T18:00:00`, end: `${formatDateISO(tomorrow)}T19:00:00` },
    { id: '10', user: 'Elena Ricci', start: `${formatDateISO(tomorrow)}T18:00:00`, end: `${formatDateISO(tomorrow)}T19:00:00` },
    { id: '11', user: 'Maria Russo', start: `${formatDateISO(day2)}T09:00:00`, end: `${formatDateISO(day2)}T10:00:00` },
    { id: '12', user: 'Roberto Marino', start: `${formatDateISO(day2)}T16:00:00`, end: `${formatDateISO(day2)}T17:00:00` },
    { id: '13', user: 'Francesca Galli', start: `${formatDateISO(day2)}T16:00:00`, end: `${formatDateISO(day2)}T17:00:00` },
    { id: '14', user: 'Giuseppe Conti', start: `${formatDateISO(day2)}T16:00:00`, end: `${formatDateISO(day2)}T17:00:00` },
    { id: '15', user: 'Chiara Bruno', start: `${formatDateISO(day2)}T16:00:00`, end: `${formatDateISO(day2)}T17:00:00` },
    { id: '16', user: 'Luca Fontana', start: `${formatDateISO(day3)}T11:00:00`, end: `${formatDateISO(day3)}T12:00:00` }
  ];

  return { bookings, allBookings };
}

// Store in-memory per le prenotazioni (simula un database)
let bookingsStore = generateBookingsData();

// Store in-memory per gli utenti (simula un database)
let usersStore = [
  {
    id: 1,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@email.com',
    phone: '+39 333 123 4567',
    company: 'Acme Corporation',
    birthdate: '1990-05-15',
    gender: 'Maschio',
    matricola: 'MAT001',
    userCode: 'ABC123XYZ456789',
    status: 'Attivo',
    bookingHistory: [
      { date: '2026-01-16', time: '10:00', hasAccess: true },
      { date: '2026-01-14', time: '18:00', hasAccess: true },
      { date: '2026-01-12', time: '08:00', hasAccess: true },
      { date: '2026-01-10', time: '14:00', hasAccess: true }
    ]
  },
  {
    id: 2,
    firstName: 'Laura',
    lastName: 'Bianchi',
    email: 'laura.bianchi@email.com',
    phone: '+39 345 678 9012',
    company: 'TechSolutions S.r.l.',
    birthdate: '1985-08-22',
    gender: 'Femmina',
    matricola: 'MAT002',
    userCode: 'DEF456UVW123456',
    status: 'Attivo',
    bookingHistory: [
      { date: '2026-01-15', time: '09:00', hasAccess: true },
      { date: '2026-01-13', time: '16:00', hasAccess: false },
      { date: '2026-01-11', time: '12:00', hasAccess: true }
    ]
  },
  {
    id: 3,
    firstName: 'Giovanni',
    lastName: 'Verdi',
    email: 'giovanni.verdi@email.com',
    phone: '+39 320 456 7890',
    company: 'Global Industries',
    birthdate: '1992-03-10',
    gender: 'Maschio',
    matricola: 'MAT003',
    userCode: 'GHI789RST012345',
    status: 'Attivo',
    bookingHistory: [
      { date: '2026-01-14', time: '07:00', hasAccess: false },
      { date: '2026-01-12', time: '19:00', hasAccess: false },
      { date: '2026-01-09', time: '10:00', hasAccess: false },
      { date: '2026-01-07', time: '15:00', hasAccess: true }
    ]
  },
  {
    id: 4,
    firstName: 'Anna',
    lastName: 'Ferrari',
    email: 'anna.ferrari@email.com',
    phone: '+39 366 789 0123',
    company: 'Innovation Labs',
    birthdate: '1988-11-30',
    gender: 'Femmina',
    matricola: 'MAT004',
    userCode: 'JKL012MNO345678',
    status: 'Attivo',
    bookingHistory: [
      { date: '2026-01-15', time: '14:00', hasAccess: true },
      { date: '2026-01-13', time: '11:00', hasAccess: true },
      { date: '2026-01-10', time: '17:00', hasAccess: true }
    ]
  },
  {
    id: 5,
    firstName: 'Paolo',
    lastName: 'Neri',
    email: 'paolo.neri@email.com',
    phone: '+39 377 890 1234',
    company: 'Digital Services',
    birthdate: '1995-07-18',
    gender: 'Maschio',
    matricola: 'MAT005',
    userCode: 'PQR345STU678901',
    status: 'Attivo',
    bookingHistory: [
      { date: '2026-01-16', time: '18:00', hasAccess: true },
      { date: '2026-01-14', time: '20:00', hasAccess: true },
      { date: '2026-01-12', time: '15:00', hasAccess: true },
      { date: '2026-01-09', time: '09:00', hasAccess: true }
    ]
  }
];

// Store in-memory per gli operatori (simula un database)
let operatorsStore = [
  {
    id: 1,
    firstName: 'Marco',
    lastName: 'Bianchi',
    email: 'marco.bianchi@palestra.it',
    phone: '+39 333 111 2233',
    birthdate: '1985-03-20',
    gender: 'Maschio',
    role: 'Operatore',
    status: 'Attivo',
    registrationDate: '2023-01-15'
  },
  {
    id: 2,
    firstName: 'Sara',
    lastName: 'Rossi',
    email: 'sara.rossi@palestra.it',
    phone: '+39 333 222 3344',
    birthdate: '1990-07-12',
    gender: 'Femmina',
    role: 'Operatore',
    status: 'Attivo',
    registrationDate: '2023-05-10'
  },
  {
    id: 3,
    firstName: 'Luca',
    lastName: 'Verdi',
    email: 'luca.verdi@palestra.it',
    phone: '+39 333 333 4455',
    birthdate: '1988-11-05',
    gender: 'Maschio',
    role: 'Operatore',
    status: 'Attivo',
    registrationDate: '2023-08-22'
  },
  {
    id: 4,
    firstName: 'Chiara',
    lastName: 'Ferrari',
    email: 'chiara.ferrari@palestra.it',
    phone: '+39 333 444 5566',
    birthdate: '1992-02-18',
    gender: 'Femmina',
    role: 'Operatore',
    status: 'Attivo',
    registrationDate: '2024-01-08'
  },
  {
    id: 5,
    firstName: 'Alessandro',
    lastName: 'Romano',
    email: 'alessandro.romano@palestra.it',
    phone: '+39 333 555 6677',
    birthdate: '1980-06-15',
    gender: 'Maschio',
    role: 'Admin',
    status: 'Attivo',
    registrationDate: '2022-03-10'
  }
];

// Endpoint per recuperare le prenotazioni base per il calendario (solo dati essenziali, SENZA dettagli utente/macchinari)
app.get('/api/bookings', (req, res) => {
  // Restituisce SOLO le prenotazioni base per il calendario (senza tutti i dettagli)
  // Questo endpoint serve solo per mostrare i badge sul calendario, NON per i dettagli
  const baseBookings = bookingsStore.bookings.map(booking => ({
    id: booking.id,
    title: booking.title,
    start: booking.start,
    end: booking.end,
    backgroundColor: booking.backgroundColor,
    borderColor: booking.borderColor
  }));
  
  console.log(`[SERVER] GET /api/bookings -> ${baseBookings.length} prenotazioni base (solo dati generici)`);
  
  const response = {
    success: true,
    data: {
      bookings: baseBookings
      // NON restituire allBookings qui - serve solo per il calcolo della disponibilità locale
    },
    message: 'Prenotazioni recuperate con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per recuperare i dettagli delle prenotazioni di un giorno specifico
// Restituisce SOLO le prenotazioni di quel giorno con TUTTI i dettagli (user, machines, ecc.)
app.get('/api/bookings/date/:date', (req, res) => {
  const requestedDate = req.params.date;
  
  // Filtra le prenotazioni per la data richiesta (con tutti i dettagli: user, machines, ecc.)
  const dayBookings = bookingsStore.bookings.filter(booking => {
    if (!booking.start) return false;
    const bookingDate = booking.start.split('T')[0];
    return bookingDate === requestedDate;
  });
  
  // Assicurati che tutte le prenotazioni abbiano tutti i dettagli (extendedProps con user, machines, ecc.)
  const detailedBookings = dayBookings.map(booking => {
    // Restituisci la prenotazione con tutti i dettagli (extendedProps, user, machines, ecc.)
    return {
      id: booking.id,
      title: booking.title || 'Prenotazione',
      start: booking.start,
      end: booking.end,
      backgroundColor: booking.backgroundColor,
      borderColor: booking.borderColor,
      user: booking.extendedProps?.user || '',
      extendedProps: {
        user: booking.extendedProps?.user || '',
        machinesFull: booking.extendedProps?.machinesFull || '',
        machines: booking.extendedProps?.machines || []
      }
    };
  });
  
  console.log(`[SERVER] GET /api/bookings/date/${requestedDate} -> ${detailedBookings.length} prenotazioni con dettagli`);
  
  const response = {
    success: true,
    data: detailedBookings, // Restituisce SOLO le prenotazioni del giorno richiesto CON TUTTI I DETTAGLI (user, machines, ecc.)
    message: `Prenotazioni per ${requestedDate} recuperate con successo`
  };
  
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per creare una nuova prenotazione
app.post('/api/bookings', (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /api/bookings`, req.body);
  
  const newBooking = {
    ...req.body,
    id: String(Date.now()),
    backgroundColor: req.body.backgroundColor || '#405189',
    borderColor: req.body.borderColor || '#405189',
    // Assicurati che extendedProps sia presente
    extendedProps: req.body.extendedProps || {
      machines: req.body.machines || [],
      machinesFull: req.body.machinesFull || '',
      user: req.body.user || req.body.extendedProps?.user || ''
    }
  };
  
  bookingsStore.bookings.push(newBooking);
  
  // Aggiungi anche a allBookings per il calcolo della disponibilità
  const userName = newBooking.extendedProps?.user || newBooking.user || '';
  if (userName) {
    bookingsStore.allBookings.push({
      id: newBooking.id,
      user: userName,
      start: newBooking.start,
      end: newBooking.end
    });
  }
  
  const response = {
    success: true,
    data: newBooking,
    message: 'Prenotazione creata con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 150);
});

// Endpoint per eliminare una prenotazione
app.delete('/api/bookings/:id', (req, res) => {
  const bookingId = req.params.id;
  console.log(`[${new Date().toISOString()}] DELETE /api/bookings/${bookingId}`);
  
  bookingsStore.bookings = bookingsStore.bookings.filter(b => b.id !== bookingId);
  bookingsStore.allBookings = bookingsStore.allBookings.filter(b => b.id !== bookingId);
  
  const response = {
    success: true,
    message: 'Prenotazione eliminata con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per recuperare la lista degli utenti
app.get('/api/users', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/users`);
  
  const response = {
    success: true,
    data: usersStore,
    message: 'Utenti recuperati con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per creare un nuovo utente
app.post('/api/users', (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /api/users`, req.body);
  
  const newUser = {
    ...req.body,
    id: usersStore.length > 0 ? Math.max(...usersStore.map(u => typeof u.id === 'number' ? u.id : parseInt(u.id))) + 1 : 1,
    status: req.body.status || 'Attivo'
  };
  
  usersStore.push(newUser);
  
  const response = {
    success: true,
    data: newUser,
    message: 'Utente creato con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 150);
});

// Endpoint per aggiornare un utente esistente
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  console.log(`[${new Date().toISOString()}] PUT /api/users/${userId}`, req.body);
  
  const userIndex = usersStore.findIndex(u => u.id.toString() === userId.toString());
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Utente non trovato'
    });
  }
  
  const updatedUser = {
    ...usersStore[userIndex],
    ...req.body,
    id: usersStore[userIndex].id // Mantieni l'ID originale
  };
  
  usersStore[userIndex] = updatedUser;
  
  const response = {
    success: true,
    data: updatedUser,
    message: 'Utente aggiornato con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 150);
});

// Endpoint per eliminare un utente
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  console.log(`[${new Date().toISOString()}] DELETE /api/users/${userId}`);
  
  const userIndex = usersStore.findIndex(u => u.id.toString() === userId.toString());
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Utente non trovato'
    });
  }
  
  usersStore.splice(userIndex, 1);
  
  const response = {
    success: true,
    message: 'Utente eliminato con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per recuperare la lista degli operatori
app.get('/api/operators', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/operators`);
  
  const response = {
    success: true,
    data: operatorsStore,
    message: 'Operatori recuperati con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per creare un nuovo operatore
app.post('/api/operators', (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /api/operators`, req.body);
  
  const newOperator = {
    ...req.body,
    id: operatorsStore.length > 0 ? Math.max(...operatorsStore.map(o => typeof o.id === 'number' ? o.id : parseInt(o.id))) + 1 : 1,
    status: req.body.status || 'Attivo',
    role: req.body.role || 'Operatore'
  };
  
  operatorsStore.push(newOperator);
  
  const response = {
    success: true,
    data: newOperator,
    message: 'Operatore creato con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 150);
});

// Endpoint per aggiornare un operatore esistente
app.put('/api/operators/:id', (req, res) => {
  const operatorId = req.params.id;
  console.log(`[${new Date().toISOString()}] PUT /api/operators/${operatorId}`, req.body);
  
  const operatorIndex = operatorsStore.findIndex(o => o.id.toString() === operatorId.toString());
  
  if (operatorIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Operatore non trovato'
    });
  }
  
  const updatedOperator = {
    ...operatorsStore[operatorIndex],
    ...req.body,
    id: operatorsStore[operatorIndex].id // Mantieni l'ID originale
  };
  
  operatorsStore[operatorIndex] = updatedOperator;
  
  const response = {
    success: true,
    data: updatedOperator,
    message: 'Operatore aggiornato con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 150);
});

// Endpoint per eliminare un operatore
app.delete('/api/operators/:id', (req, res) => {
  const operatorId = req.params.id;
  console.log(`[${new Date().toISOString()}] DELETE /api/operators/${operatorId}`);
  
  const operatorIndex = operatorsStore.findIndex(o => o.id.toString() === operatorId.toString());
  
  if (operatorIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Operatore non trovato'
    });
  }
  
  operatorsStore.splice(operatorIndex, 1);
  
  const response = {
    success: true,
    message: 'Operatore eliminato con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per recuperare il profilo dell'operatore
app.get('/api/operator/profile', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/operator/profile`);
  
  const response = {
    success: true,
    data: {
      id: 1,
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@email.com',
      phone: '+39 333 123 4567',
      birthdate: '1990-05-15',
      gender: 'Maschio',
      role: 'Operatore',
      avatar: 'assets/images/users/avatar-1.jpg'
    },
    message: 'Profilo operatore recuperato con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 100);
});

// Endpoint per aggiornare il profilo dell'operatore
app.put('/api/operator/profile', (req, res) => {
  console.log(`[${new Date().toISOString()}] PUT /api/operator/profile`, req.body);
  
  const updatedProfile = {
    id: 1,
    firstName: req.body.firstName || 'Mario',
    lastName: req.body.lastName || 'Rossi',
    email: req.body.email || 'mario.rossi@email.com',
    phone: req.body.phone || '+39 333 123 4567',
    birthdate: req.body.birthdate || '1990-05-15',
    gender: req.body.gender || 'Maschio',
    role: 'Operatore',
    avatar: req.body.avatar || 'assets/images/users/avatar-1.jpg'
  };
  
  const response = {
    success: true,
    data: updatedProfile,
    message: 'Profilo operatore aggiornato con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 150);
});

// Endpoint per cambiare la password dell'operatore
app.post('/api/operator/profile/change-password', (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /api/operator/profile/change-password`);
  
  const response = {
    success: true,
    message: 'Password cambiata con successo'
  };
  
  setTimeout(() => {
    res.json(response);
  }, 150);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Avvia il server
app.listen(PORT, () => {
  console.log(`\n🚀 Mock Server avviato su http://localhost:${PORT}`);
  console.log(`📊 Endpoint disponibili:`);
  console.log(`   - GET /api/dashboard/stats`);
  console.log(`   - GET /api/dashboard/stats/current-presences`);
  console.log(`   - GET /api/bookings (prenotazioni base per calendario)`);
  console.log(`   - GET /api/bookings/date/:date (dettagli prenotazioni per giorno)`);
  console.log(`   - POST /api/bookings`);
  console.log(`   - DELETE /api/bookings/:id`);
  console.log(`   - GET /api/users`);
  console.log(`   - POST /api/users`);
  console.log(`   - PUT /api/users/:id`);
  console.log(`   - DELETE /api/users/:id`);
  console.log(`   - GET /api/operators`);
  console.log(`   - POST /api/operators`);
  console.log(`   - PUT /api/operators/:id`);
  console.log(`   - DELETE /api/operators/:id`);
  console.log(`   - GET /api/operator/profile`);
  console.log(`   - PUT /api/operator/profile`);
  console.log(`   - POST /api/operator/profile/change-password`);
  console.log(`   - GET /health\n`);
});

// Gestione errori
app.on('error', (err) => {
  console.error('Errore nel server:', err);
});

