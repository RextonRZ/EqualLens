# Contributing to EqualLens

Thank you for your interest in contributing to EqualLens! We're excited to have you join our effort to create a fair and unbiased AI-powered recruitment platform. This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Contribution Workflow](#contribution-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
  - [Backend Testing](#backend-testing)
  - [Frontend Testing](#frontend-testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inclusive environment for all contributors regardless of gender, sexual orientation, disability, race, ethnicity, age, religion, or experience level.

**Key principles:**

- Be respectful and inclusive  
- Give and gracefully accept constructive feedback  
- Focus on what is best for the community and the project  
- Show empathy towards other community members  

## Getting Started

Before you begin:

- **Familiarize yourself with the project**: Read through the `README.md` to understand the project's goals, architecture, and technologies used.
- **Check existing issues**: Browse through the open issues to see if there's something you'd like to work on or if someone is already working on your issue.
- **Join the discussion**: Feel free to comment on issues, ask questions, or propose new features.

## Development Setup

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- Firebase account
- Google Cloud Platform account with enabled APIs:
  - Document AI
  - Natural Language
  - Cloud Vision
  - Speech-to-Text
  - Gemini

### Backend Setup

1. Fork and clone the repository:

    ```bash
    git clone https://github.com/YOUR-USERNAME/equallens.git
    cd equallens/backend
    ```

2. Create a virtual environment and install dependencies:

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3. Set up Firebase credentials:

    ```bash
    # Create a firebase_config.json file with your Firebase service account key
    ```

4. Configure environment variables as described in `README.md`

5. Start the backend server:

    ```bash
    uvicorn main:app --reload
    ```

### Frontend Setup

1. Navigate to the frontend directory:

    ```bash
    cd ../frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Configure environment variables as described in `README.md`

4. Start the frontend development server:

    ```bash
    npm start
    ```

## Contribution Workflow

1. **Create a new branch**:  
    ```bash
    git checkout -b feature/your-feature-name
    ```

2. **Make your changes**: Implement your feature or bug fix.

3. **Commit your changes**:  
    ```bash
    git commit -m "Add feature: brief description of changes"
    ```

4. **Keep your branch updated**:  
    ```bash
    git fetch origin
    git rebase origin/main
    ```

5. **Push your changes**:  
    ```bash
    git push origin feature/your-feature-name
    ```

6. **Create a pull request**: Submit a PR from your branch to the main repository.

## Pull Request Guidelines

- Fill out the PR template
- Reference related issues using GitHub issue linking syntax
- Keep PRs focused on a single concern
- Update documentation where relevant
- Add tests for new features or bug fixes
- Ensure all CI checks pass

## Coding Standards

### Python (Backend)

- Follow [PEP 8](https://peps.python.org/pep-0008/) style guidelines
- Use FastAPI best practices
- Write docstrings for all functions, classes, and modules
- Keep functions focused and under 50 lines if possible

### JavaScript/React (Frontend)

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use functional components with hooks
- Implement proper error handling
- Use meaningful variable and function names
- Keep components modular and reusable

## Testing Guidelines

- Write unit tests for new features and bug fixes
- Ensure tests are isolated from external services
- Mock external dependencies as needed
- Aim for high test coverage, especially for critical paths
- Run the test suite locally before submitting a PR

### Backend Testing

```bash
pytest
# Contributing to EqualLens

Thank you for your interest in contributing to EqualLens! We're excited to have you join our effort to create a fair and unbiased AI-powered recruitment platform. This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Contribution Workflow](#contribution-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
  - [Backend Testing](#backend-testing)
  - [Frontend Testing](#frontend-testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inclusive environment for all contributors regardless of gender, sexual orientation, disability, race, ethnicity, age, religion, or experience level.

**Key principles:**

- Be respectful and inclusive  
- Give and gracefully accept constructive feedback  
- Focus on what is best for the community and the project  
- Show empathy towards other community members  

## Getting Started

Before you begin:

- **Familiarize yourself with the project**: Read through the `README.md` to understand the project's goals, architecture, and technologies used.
- **Check existing issues**: Browse through the open issues to see if there's something you'd like to work on or if someone is already working on your issue.
- **Join the discussion**: Feel free to comment on issues, ask questions, or propose new features.

## Development Setup

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- Firebase account
- Google Cloud Platform account with enabled APIs:
  - Document AI
  - Natural Language
  - Cloud Vision
  - Speech-to-Text
  - Gemini

### Backend Setup

1. Fork and clone the repository:

    ```bash
    git clone https://github.com/YOUR-USERNAME/equallens.git
    cd equallens/backend
    ```

2. Create a virtual environment and install dependencies:

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3. Set up Firebase credentials:

    ```bash
    # Create a firebase_config.json file with your Firebase service account key
    ```

4. Configure environment variables as described in `README.md`

5. Start the backend server:

    ```bash
    uvicorn main:app --reload
    ```

### Frontend Setup

1. Navigate to the frontend directory:

    ```bash
    cd ../frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Configure environment variables as described in `README.md`

4. Start the frontend development server:

    ```bash
    npm start
    ```

## Contribution Workflow

1. **Create a new branch**:  
    ```bash
    git checkout -b feature/your-feature-name
    ```

2. **Make your changes**: Implement your feature or bug fix.

3. **Commit your changes**:  
    ```bash
    git commit -m "Add feature: brief description of changes"
    ```

4. **Keep your branch updated**:  
    ```bash
    git fetch origin
    git rebase origin/main
    ```

5. **Push your changes**:  
    ```bash
    git push origin feature/your-feature-name
    ```

6. **Create a pull request**: Submit a PR from your branch to the main repository.

## Pull Request Guidelines

- Fill out the PR template
- Reference related issues using GitHub issue linking syntax
- Keep PRs focused on a single concern
- Update documentation where relevant
- Add tests for new features or bug fixes
- Ensure all CI checks pass

## Coding Standards

### Python (Backend)

- Follow [PEP 8](https://peps.python.org/pep-0008/) style guidelines
- Use FastAPI best practices
- Write docstrings for all functions, classes, and modules
- Keep functions focused and under 50 lines if possible

### JavaScript/React (Frontend)

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use functional components with hooks
- Implement proper error handling
- Use meaningful variable and function names
- Keep components modular and reusable

## Testing Guidelines

- Write unit tests for new features and bug fixes
- Ensure tests are isolated from external services
- Mock external dependencies as needed
- Aim for high test coverage, especially for critical paths
- Run the test suite locally before submitting a PR

### Backend Testing

```bash
pytest
# Contributing to EqualLens

Thank you for your interest in contributing to EqualLens! We're excited to have you join our effort to create a fair and unbiased AI-powered recruitment platform. This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Contribution Workflow](#contribution-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
  - [Backend Testing](#backend-testing)
  - [Frontend Testing](#frontend-testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inclusive environment for all contributors regardless of gender, sexual orientation, disability, race, ethnicity, age, religion, or experience level.

**Key principles:**

- Be respectful and inclusive  
- Give and gracefully accept constructive feedback  
- Focus on what is best for the community and the project  
- Show empathy towards other community members  

## Getting Started

Before you begin:

- **Familiarize yourself with the project**: Read through the `README.md` to understand the project's goals, architecture, and technologies used.
- **Check existing issues**: Browse through the open issues to see if there's something you'd like to work on or if someone is already working on your issue.
- **Join the discussion**: Feel free to comment on issues, ask questions, or propose new features.

## Development Setup

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- Firebase account
- Google Cloud Platform account with enabled APIs:
  - Document AI
  - Natural Language
  - Cloud Vision
  - Speech-to-Text
  - Gemini

### Backend Setup

1. Fork and clone the repository:

    ```bash
    git clone https://github.com/YOUR-USERNAME/equallens.git
    cd equallens/backend
    ```

2. Create a virtual environment and install dependencies:

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3. Set up Firebase credentials:

    ```bash
    # Create a firebase_config.json file with your Firebase service account key
    ```

4. Configure environment variables as described in `README.md`

5. Start the backend server:

    ```bash
    uvicorn main:app --reload
    ```

### Frontend Setup

1. Navigate to the frontend directory:

    ```bash
    cd ../frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Configure environment variables as described in `README.md`

4. Start the frontend development server:

    ```bash
    npm start
    ```

## Contribution Workflow

1. **Create a new branch**:  
    ```bash
    git checkout -b feature/your-feature-name
    ```

2. **Make your changes**: Implement your feature or bug fix.

3. **Commit your changes**:  
    ```bash
    git commit -m "Add feature: brief description of changes"
    ```

4. **Keep your branch updated**:  
    ```bash
    git fetch origin
    git rebase origin/main
    ```

5. **Push your changes**:  
    ```bash
    git push origin feature/your-feature-name
    ```

6. **Create a pull request**: Submit a PR from your branch to the main repository.

## Pull Request Guidelines

- Fill out the PR template
- Reference related issues using GitHub issue linking syntax
- Keep PRs focused on a single concern
- Update documentation where relevant
- Add tests for new features or bug fixes
- Ensure all CI checks pass

## Coding Standards

### Python (Backend)

- Follow [PEP 8](https://peps.python.org/pep-0008/) style guidelines
- Use FastAPI best practices
- Write docstrings for all functions, classes, and modules
- Keep functions focused and under 50 lines if possible

### JavaScript/React (Frontend)

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use functional components with hooks
- Implement proper error handling
- Use meaningful variable and function names
- Keep components modular and reusable

## Testing Guidelines

- Write unit tests for new features and bug fixes
- Ensure tests are isolated from external services
- Mock external dependencies as needed
- Aim for high test coverage, especially for critical paths
- Run the test suite locally before submitting a PR

### Backend Testing

```bash
pytest
```

### Frontend Testing
```bash
npm test
```

## Documentation

Good documentation is crucial for usability and maintenance:

- Update the `README.md` when adding new features
- Document all API endpoints
- Add inline comments for complex code sections
- Update environment variable requirements for new services
- Document any new dependencies or setup steps

## Issue Reporting

When reporting issues:

- Use the issue template
- Include steps to reproduce the bug
- Describe expected vs. actual behavior
- Include screenshots if applicable
- List environment details (browser version, OS, etc.)
- Tag issues appropriately (`bug`, `enhancement`, `documentation`, etc.)

## Feature Requests

We welcome feature suggestions:
- Check for duplicates in existing issues/PRs
- Use the feature request template
- Explain the problem your feature solves
- Describe the desired solution
- Outline alternative solutions you've considered
- Provide context on who would benefit and why

## Community
- Join our community discussions
- Help answer questions from other contributors
- Participate in code reviews
- Share the project with others who might be interested
