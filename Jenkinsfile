pipeline {
  agent any
  options {
    timestamps()
    ansiColor('xterm')
    skipDefaultCheckout(true)
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
          mkdir -p reports/junit

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
          junit 'reports/junit/junit.xml'   // <-- matches your package.json outputDirectory
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
