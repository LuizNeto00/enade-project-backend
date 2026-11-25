export const QUESTION_VALIDATION_MESSAGES = {
  examYear: (year: number) =>
    `O ano da questão deve estar entre 2004 e ${year}.`,
  invalidCourse: 'Selecione um curso válido.',
  invalidDifficulty: 'A dificuldade informada é inválida.',
  invalidOptionCount: 'A questão deve possuir exatamente 4 ou 5 alternativas.',
  optionCountMismatch:
    'A quantidade de alternativas não corresponde às alternativas enviadas.',
  optionLabels:
    'As alternativas devem seguir a sequência A, B, C, D e, quando aplicável, E.',
  duplicateOption: 'Não são permitidas alternativas repetidas.',
  invalidOptionContent: (label: string) =>
    `A alternativa ${label} é obrigatória e deve possuir conteúdo válido.`,
  missingOption: (label: string) => `A alternativa ${label} é obrigatória.`,
  invalidCorrectOption:
    'A alternativa correta não corresponde às alternativas disponíveis.',
  invalidStatement: 'O enunciado da questão é obrigatório.',
  invalidAnswerComment: 'A resposta comentada é obrigatória.',
  invalidImageManifest: 'O manifesto de imagens possui um formato inválido.',
  invalidImageField: 'O manifesto contém uma referência de campo inválida.',
  invalidImageReference:
    'A referência da imagem não corresponde ao conteúdo informado.',
  imageFileCount:
    'As imagens enviadas não correspondem ao conteúdo da questão.',
  imageSize: 'Cada imagem deve possuir até 10 MB.',
  imageType: 'Formato de imagem inválido.',
  invalidImage: 'O arquivo enviado não é uma imagem válida.',
  teacherOnlyCreate: 'Somente professores podem cadastrar questões.',
  teacherOnlyList: 'Acesso restrito a professores.',
  questionNotFound: 'Questão não encontrada.',
  questionEditForbidden: 'Você não pode editar esta questão.',
  questionDeleteForbidden: 'Você não pode remover esta questão.',
  invalidCreatedDateRange:
    'A data inicial não pode ser posterior à data final.',
  invalidQuestionStatus: 'Selecione um status válido para a questão.',
  teacherOnlyUpdate: 'Somente professores podem editar questões.',
  teacherOnlyDelete: 'Somente professores podem remover questões.',
  studentOnlyList: 'Somente alunos podem acessar o banco de questões.',
  studentOnlyAnswer: 'Somente alunos podem responder questões.',
  invalidStudentOption:
    'A alternativa selecionada não está disponível nesta questão.',
  invalidSelectedOption: 'Selecione uma alternativa válida.',
} as const;
