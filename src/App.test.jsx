import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    promise: vi.fn((promise, _msgs) => promise.then(() => {})),
  },
  Toaster: () => null,
}))

// Default mock response for GET /getStudents
const mockStudents = [
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    dob: '1999-05-20',
    gender: 'Female',
  },
]

beforeEach(() => {
  vi.clearAllMocks()  // clears call history but preserves mock implementations

  global.fetch = vi.fn((url) => {
    if (url.includes('/getStudents')) {
      return Promise.resolve({
        json: () => Promise.resolve(mockStudents),
      })
    }
    if (url.includes('/addStudent')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      })
    }
    return Promise.reject(new Error('Unknown endpoint'))
  })
})

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('App – rendering', () => {
  it('renders the Register Student heading', async () => {
    render(<App />)
    expect(screen.getByText('Register Student')).toBeInTheDocument()
  })

  it('renders the Registered Students heading', async () => {
    render(<App />)
    expect(screen.getByText('Registered Students')).toBeInTheDocument()
  })

  it('renders all form input fields', () => {
    render(<App />)
    expect(screen.getByPlaceholderText('Enter full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument() // gender select
  })

  it('renders the Register submit button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('renders form labels', () => {
    render(<App />)
    expect(screen.getByText('Full Name')).toBeInTheDocument()
    // These texts appear in both form labels and table headers
    expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Date of Birth').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Gender').length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// Student table – initial seed data
// ---------------------------------------------------------------------------
describe('App – student table', () => {
  it('shows the default seeded student (John Doe) before fetch resolves', () => {
    render(<App />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
  })

  it('displays fetched students after mount', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
    // 'Female' also appears as a <option> in the gender select
    expect(screen.getAllByText('Female').length).toBeGreaterThanOrEqual(1)
  })

  it('shows "No students registered yet" when fetch returns empty array', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve([]) })
    )
    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByText(/no students registered yet/i)
      ).toBeInTheDocument()
    })
  })

  it('renders table column headers', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('Jane Smith'))
    expect(screen.getAllByText('Name').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(2)     // label + th
    expect(screen.getAllByText('Date of Birth').length).toBeGreaterThanOrEqual(2) // label + th
    expect(screen.getAllByText('Gender').length).toBeGreaterThanOrEqual(2)    // label + th + option
  })
})

// ---------------------------------------------------------------------------
// Form interaction
// ---------------------------------------------------------------------------
describe('App – form interactions', () => {
  it('updates the name field when the user types', async () => {
    const user = userEvent.setup()
    render(<App />)
    const nameInput = screen.getByPlaceholderText('Enter full name')
    await user.type(nameInput, 'Alice')
    expect(nameInput).toHaveValue('Alice')
  })

  it('updates the email field when the user types', async () => {
    const user = userEvent.setup()
    render(<App />)
    const emailInput = screen.getByPlaceholderText('Enter email')
    await user.type(emailInput, 'alice@example.com')
    expect(emailInput).toHaveValue('alice@example.com')
  })

  it('updates the gender select when the user chooses an option', async () => {
    const user = userEvent.setup()
    render(<App />)
    const genderSelect = screen.getByRole('combobox')
    await user.selectOptions(genderSelect, 'Female')
    expect(genderSelect).toHaveValue('Female')
  })

  it('updates the date of birth field', () => {
    render(<App />)
    const dobInput = document.querySelector('input[name="dob"]')
    fireEvent.change(dobInput, { target: { name: 'dob', value: '2000-06-15' } })
    expect(dobInput).toHaveValue('2000-06-15')
  })

})

---------------------------------------------------------------------------
Form submission
---------------------------------------------------------------------------
describe('App – form submission', () => {
  it('calls fetch with the correct endpoint and method on submit', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByPlaceholderText('Enter full name'), 'Alice')
    await user.type(screen.getByPlaceholderText('Enter email'), 'alice@example.com')
    fireEvent.change(document.querySelector('input[name="dob"]'), {
      target: { value: '2000-06-15' },
    })
    await user.selectOptions(screen.getByRole('combobox'), 'Female')

    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find((call) =>
        call[0].includes('/addStudent')
      )
      expect(postCall).toBeDefined()
      expect(postCall[1].method).toBe('POST')
    })
  })

  it('sends the form data as JSON in the request body', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByPlaceholderText('Enter full name'), 'Bob')
    await user.type(screen.getByPlaceholderText('Enter email'), 'bob@example.com')
    fireEvent.change(document.querySelector('input[name="dob"]'), {
      target: { value: '1995-03-10' },
    })
    await user.selectOptions(screen.getByRole('combobox'), 'Male')

    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find((call) =>
        call[0].includes('/addStudent')
      )
      expect(postCall).toBeDefined()
      const body = JSON.parse(postCall[1].body)
      expect(body.name).toBe('Bob')
      expect(body.email).toBe('bob@example.com')
    })
  })
})

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
// describe('App – error handling', () => {
//   it('handles fetch failure on mount without crashing', async () => {
//     global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
//     const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
//     render(<App />)
//     await waitFor(() => {
//       expect(consoleSpy).toHaveBeenCalledWith(
//         'Failed to fetch students',
//         expect.any(Error)
//       )
//     })
//     consoleSpy.mockRestore()
//   })
// })

