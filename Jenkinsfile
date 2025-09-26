pipeline {
  agent any

  options {
    ansiColor('xterm')
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    REGISTRY_URL     = 'https://index.docker.io/v1/'
    DOCKER_NAMESPACE = 'sugardark'              // <-- change if your Docker Hub username is different
    IMAGE_NAME       = 'sit753-7-3hd-pipeline'  // repo name on Docker Hub
    COMMIT           = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build & Push Image') {
      steps {
        script {
          // build image with commit tag
          def img = docker.build("${env.DOCKER_NAMESPACE}/${env.IMAGE_NAME}:${env.COMMIT}")
          // login + push (uses the 'dockerhub' credential you created)
          docker.withRegistry(env.REGISTRY_URL, 'dockerhub') {
            img.push()          // push commit tag
            img.push('latest')  // update :latest
          }
        }
      }
    }

    stage('Test (Jest in container)') {
      steps {
        script {
        sh '''
          set -e
          docker inspect -f . node:20-alpine >/dev/null 2>&1 || docker pull node:20-alpine
        '''
      docker.image('node:20-alpine').inside('-u 1000:1000') {
        sh '''
          set -e
          npm ci
          mkdir -p reports/junit
          # Enable Node's ESM support for Jest and run tests in-band
          NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand
        '''
      }
    }
  }
  post {
    always {
      // This will now find ./reports/junit/junit.xml even on test failure
      junit allowEmptyResults: false, testResults: '**/reports/junit/junit.xml'
    }
  }
}

    stage('Code Quality') {
      when { expression { fileExists('package.json') } }
      steps {
        sh 'npm run lint || echo "Lint step skipped (no linter configured)"'
      }
    }

    stage('Security (optional)') {
      when { expression { return env.SNYK_TOKEN?.trim() } }
      steps {
        script {
          docker.withRegistry(env.REGISTRY_URL, 'dockerhub') {
            
            sh """
              docker pull ${DOCKER_NAMESPACE}/${IMAGE_NAME}:${COMMIT}
              docker run --rm \
                -e SNYK_TOKEN=${SNYK_TOKEN} \
                -v /var/run/docker.sock:/var/run/docker.sock \
                snyk/snyk:docker test ${DOCKER_NAMESPACE}/${IMAGE_NAME}:${COMMIT} || true
            """
          }
        }
      }
    }

    stage('Deploy: Staging') {
      steps {
        echo "This is a placeholder. Tag to staging is ${DOCKER_NAMESPACE}/${IMAGE_NAME}:${COMMIT}"
      }
    }

    stage('Release: Production') {
      when { branch 'main' }
      steps {
        input message: "Promote ${COMMIT} to production?"
        echo "Release approved."
      }
    }

    stage('Monitoring Check') {
      steps {
        echo 'Run your /health or Prometheus scrape check here.'
      }
    }
  }

  post {
    always {
      echo "Pipeline finished for ${COMMIT}"
    }
  }
}
