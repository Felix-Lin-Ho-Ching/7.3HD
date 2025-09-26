
pipeline {
  agent any
  options {
    timestamps()
    ansiColor('xterm')
    skipDefaultCheckout(true)
  }

  parameters {
    string(name: 'DOCKERHUB_REPO', defaultValue: '', description: 'Optional: docker hub repo (e.g. myuser/sit753-7-3hd-pipeline). Leave blank to skip push.')
    string(name: 'DOCKERHUB_CREDS_ID', defaultValue: '', description: 'Optional: Jenkins Credentials ID (Username with Password). Required if DOCKERHUB_REPO is set.')
  }

  environment {
    APP_NAME = 'sit753-7-3hd-pipeline'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          env.GIT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
          echo "Commit: ${env.GIT_SHA}"
        }
      }
    }

    stage('Build Image (local)') {
      steps {
        sh '''
          set -eux
          docker version
          # Build locally; no registry login required
          docker build -t "${APP_NAME}:${GIT_SHA}" -t "${APP_NAME}:latest" .
          docker images | grep "${APP_NAME}"
        '''
      }
    }

    stage('Test (inside container)') {
      steps {
        sh '''
          set -eux
          rm -rf reports
          mkdir -p reports

          # Run tests inside the image. We set NPM_CONFIG_PRODUCTION=false to ensure devDependencies (jest) are installed.
          docker run --rm \
            -e NODE_ENV=development \
            -e NPM_CONFIG_PRODUCTION=false \
            -v "$PWD/reports:/app/reports" \
            "${APP_NAME}:${GIT_SHA}" \
            sh -lc 'npm ci && npx jest --runInBand --ci --reporters=default --reporters=jest-junit'
        '''
      }
      post {
        always {
          // Publish JUnit even if tests fail
          junit 'reports/junit.xml'
        }
      }
    }

    stage('Push to Docker Hub (optional)') {
      when {
        allOf {
          expression { params.DOCKERHUB_REPO?.trim()?.length() > 0 }
          expression { params.DOCKERHUB_CREDS_ID?.trim()?.length() > 0 }
        }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: "${params.DOCKERHUB_CREDS_ID}", usernameVariable: 'DOCKERHUB_USER', passwordVariable: 'DOCKERHUB_PASS')]) {
          sh '''
            set -eux
            echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin

            docker tag "${APP_NAME}:${GIT_SHA}" "${DOCKERHUB_REPO}:${GIT_SHA}"
            docker tag "${APP_NAME}:latest" "${DOCKERHUB_REPO}:latest"

            docker push "${DOCKERHUB_REPO}:${GIT_SHA}"
            docker push "${DOCKERHUB_REPO}:latest"
          '''
        }
      }
    }
  }

  post {
    always {
      echo "Pipeline finished for ${env.GIT_SHA ?: 'n/a'}"
    }
  }
}

