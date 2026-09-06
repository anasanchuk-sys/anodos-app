(function(scope){
  'use strict';
  function normalize(payload,documents){
    const result=scope.AnodosPropertyReviewSemantic.normalizeAnalysis(payload,documents,scope.AnodosPropertyReview.checks);
    if(payload.meta?.source_selection_used){result.complete=false;result.reviewWarnings.unshift('Довгий пакет прочитано частинами. Для підсумкового аналізу модель відібрала пов’язані умови; можливі пропуски під час відбору. Це попередній, а не повний висновок.');}
    for(const d of documents){
      if(d.ocrPages){result.complete=false;result.reviewWarnings.push(`«${d.name}»: текст розпізнано OCR. Звірте суми та цитати зі сканом; розбіжності з текстовим шаром потребують ручного уточнення.`);}
      if(d.hasUnresolvedRevisions){result.complete=false;result.reviewWarnings.push(`«${d.name}»: є неприйняті правки Word. Перевірте остаточну редакцію.`);}
      for(const warning of Array.isArray(d.extractionWarnings)?d.extractionWarnings:[]){result.complete=false;result.reviewWarnings.push(`«${d.name}»: ${warning}`);}
    }
    if(!result.complete&&!/не можна вважати повною|потребує уточнення/i.test(result.overallAssessment))result.overallAssessment+=' Перевірка попередня: дивіться застереження нижче.';
    return result;
  }
  scope.AnodosLocalReviewResult=Object.freeze({normalize});
})(typeof window!=='undefined'?window:globalThis);
